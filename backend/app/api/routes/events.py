# ============================================================================
# NEXUS BACKEND — Events API Routes
# ============================================================================
# Handles CRUD operations for the event being organized.
# In a hackathon demo, there's typically one event at a time.
#
# Endpoints:
#   POST /api/events       → Create a new event (from natural language prompt)
#   GET  /api/events/{id}  → Get event by ID
#   PUT  /api/events/{id}  → Update event details
#   GET  /api/events       → List all events
# ============================================================================

import uuid
import json
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.state.state_manager import state_manager

# Create the router — mounted in main.py under /api prefix
router = APIRouter()


# ============================================================================
# Request model for event creation
# ============================================================================

class CreateEventRequest(BaseModel):
    """
    The frontend sends a natural language prompt describing the event.
    The LLM parser extracts structured details from it.
    """
    prompt: str


# ============================================================================
# POST /api/events — Create a new event from a natural language prompt
# ============================================================================

@router.post("/events")
async def create_event(request: CreateEventRequest):
    """
    Create a new event from a natural language prompt.
    
    The prompt is parsed by the LLM event parser to extract structured
    details like name, dates, location, expected attendees, etc.
    Missing fields are stored as null — the organizer can update later.
    """
    prompt = request.prompt
    if not prompt or not prompt.strip():
        raise HTTPException(status_code=400, detail="Event prompt is required")

    # ---- Step 1: Parse the prompt with the LLM ----
    from app.agents.event_parser import parse_event_from_prompt
    try:
        parsed = await parse_event_from_prompt(prompt.strip())
    except ValueError as e:
        raise HTTPException(
            status_code=400, 
            detail="Failed to parse event details from prompt. Please ensure you are connected to the LLM or try a more descriptive prompt."
        )

    # ---- Step 2: Build the event record ----
    event_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    event = {
        "id": event_id,
        "name": parsed.get("name"),
        "description": parsed.get("description", prompt.strip()),
        "start_date": parsed.get("start_date"),
        "end_date": parsed.get("end_date"),
        "location": parsed.get("location"),
        "organizer_name": parsed.get("organizer_name"),
        "status": "draft",
        "config_json": json.dumps({
            "event_type": parsed.get("event_type"),
            "expected_attendees": parsed.get("expected_attendees"),
            "themes": parsed.get("themes", []),
            "key_activities": parsed.get("key_activities", []),
            "venues": parsed.get("venues"),
            "original_prompt": prompt.strip(),
        }),
        "venues": parsed.get("venues") or [],
        "created_at": now,
        "updated_at": now,
    }

    # ---- Step 3: Store in the database ----
    from app.database import get_db
    db = await get_db()
    await db.execute(
        """INSERT INTO events (id, name, description, start_date, end_date, 
           location, organizer_name, status, config_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (event["id"], event["name"], event["description"],
         event["start_date"], event["end_date"],
         event["location"], event["organizer_name"],
         event["status"], event["config_json"], now, now)
    )
    await db.commit()

    # ---- Step 4: Update in-memory state ----
    state_manager.initialize()
    state_manager.set_event(event)

    # ---- Step 5: Log the activity ----
    state_manager.add_activity({
        "agent": "system",
        "action": "event_created",
        "details": f"Event '{event['name']}' created from prompt",
    })

    return {
        "status": "success",
        "event": event,
        "parsed_details": parsed,
    }


# ============================================================================
# GET /api/events/{event_id} — Get event by ID
# ============================================================================

@router.get("/events/{event_id}")
async def get_event(event_id: str):
    """
    Get a specific event by its ID.
    
    First checks the in-memory state, then falls back to the database.
    """
    # Try in-memory state first (faster)
    event = state_manager.get_event()
    if event and event.get("id") == event_id:
        return {"status": "success", "event": event}

    # Fall back to database
    from app.database import get_db
    db = await get_db()
    cursor = await db.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    # Convert the database row to a dict
    event = dict(row)
    return {"status": "success", "event": event}


# ============================================================================
# POST /api/events/{event_id}/activate — Switch context to this event
# ============================================================================

@router.post("/events/{event_id}/activate")
async def activate_event(event_id: str):
    """
    Activates a specific event.
    
    This loads the event and all its associated data (participants, schedule,
    content, approvals, logs) from the database into the in-memory state manager.
    This effectively "switches" the entire dashboard context to this event.
    """
    from app.database import get_db
    from app.repository import get_participants, get_sessions, get_content_queue, get_approvals, get_agent_logs
    
    db = await get_db()
    cursor = await db.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    event = dict(row)
    
    # 1. Clear existing state by re-initializing
    state_manager.initialize()
    
    # 2. Load the event
    state_manager.set_event(event)
    
    # 2.5 Load specific config data (like Fortuna's finance_data)
    try:
        config_data = json.loads(event.get("config_json", "{}"))
        if "finance_data" in config_data:
            state_manager.set_finance_data(config_data["finance_data"])
    except json.JSONDecodeError:
        pass
        
    # 3. Load all related data
    try:
        participants = await get_participants(event_id)
        state_manager.set_participants(participants)
        
        schedule = await get_sessions(event_id)
        state_manager.set_schedule(schedule)
        
        content = await get_content_queue(event_id)
        state_manager.set_content_queue(content)
        
        approvals = await get_approvals(event_id)
        for acc in approvals:
            state_manager.add_approval(acc)
            
        logs = await get_agent_logs(event_id, limit=50)
        for log in reversed(logs):
            state_manager.add_activity({"agent": log["agent"], "action": log["action"], "details": log["details"], "timestamp": log["created_at"]})
            
        # Log the context switch
        state_manager.add_activity({
            "agent": "system",
            "action": "event_activated",
            "details": f"Switched context to event: '{event['name']}'",
        })
        
    except Exception as e:
        print(f"Error loading event context for {event_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load event context: {str(e)}")

    return {
        "status": "success", 
        "message": f"Successfully activated event {event['name']}",
        "event": event
    }


# ============================================================================
# PUT /api/events/{event_id} — Update event details
# ============================================================================

@router.put("/events/{event_id}")
async def update_event(
    event_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location: Optional[str] = None,
    organizer_name: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    Update an existing event's details.
    
    Only provided fields are updated — omitted fields stay unchanged.
    Triggers EVENT_DETAILS_CHANGED event for agents that care about it.
    """
    now = datetime.now().isoformat()

    # Get the current event from the database
    from app.database import get_db
    db = await get_db()
    cursor = await db.execute("SELECT * FROM events WHERE id = ?", (event_id,))
    row = await cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")

    # Build the update — only update fields that were provided
    current = dict(row)
    updated = {
        "name": name or current["name"],
        "description": description if description is not None else current["description"],
        "start_date": start_date or current["start_date"],
        "end_date": end_date or current["end_date"],
        "location": location if location is not None else current["location"],
        "organizer_name": organizer_name if organizer_name is not None else current["organizer_name"],
        "status": status or current["status"],
        "updated_at": now,
    }

    # Update the database
    await db.execute(
        """UPDATE events SET name=?, description=?, start_date=?, end_date=?,
           location=?, organizer_name=?, status=?, updated_at=?
           WHERE id=?""",
        (updated["name"], updated["description"], updated["start_date"],
         updated["end_date"], updated["location"], updated["organizer_name"],
         updated["status"], now, event_id)
    )
    await db.commit()

    # Update in-memory state
    updated["id"] = event_id
    updated["created_at"] = current["created_at"]
    state_manager.set_event(updated)

    # Log the activity
    state_manager.add_activity({
        "agent": "system",
        "action": "event_updated",
        "details": f"Event '{updated['name']}' updated",
    })

    return {"status": "success", "event": updated}


# ============================================================================
# GET /api/events — List all events
# ============================================================================

@router.get("/events")
async def list_events():
    """
    List all events.
    
    For the hackathon demo, there's usually just one event.
    But this endpoint supports multiple for flexibility.
    """
    from app.database import get_db
    db = await get_db()
    cursor = await db.execute("SELECT * FROM events ORDER BY created_at DESC")
    rows = await cursor.fetchall()

    events = [dict(row) for row in rows]
    return {"status": "success", "events": events, "count": len(events)}
