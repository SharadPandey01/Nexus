# ============================================================================
# NEXUS BACKEND — Events API Routes
# ============================================================================
# Handles CRUD operations for the event being organized.
# In a hackathon demo, there's typically one event at a time.
#
# Endpoints:
#   POST /api/events       → Create a new event
#   GET  /api/events/{id}  → Get event by ID
#   PUT  /api/events/{id}  → Update event details
#   GET  /api/events       → List all events
# ============================================================================

import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException

from app.state.state_manager import state_manager

# Create the router — mounted in main.py under /api prefix
router = APIRouter()


# ============================================================================
# POST /api/events — Create a new event
# ============================================================================

@router.post("/events")
async def create_event(
    name: str,
    description: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    location: Optional[str] = None,
    organizer_name: Optional[str] = None,
):
    """
    Create a new event.
    
    This is the first thing the organizer does — set up their event
    with basic details. Agents use this info for context.
    """
    # Generate a unique ID for the event
    event_id = str(uuid.uuid4())
    now = datetime.now().isoformat()

    # Build the event dict
    event = {
        "id": event_id,
        "name": name,
        "description": description,
        "start_date": start_date,
        "end_date": end_date,
        "location": location,
        "organizer_name": organizer_name,
        "status": "draft",
        "created_at": now,
        "updated_at": now,
    }

    # Store in the database
    from app.database import get_db
    db = await get_db()
    await db.execute(
        """INSERT INTO events (id, name, description, start_date, end_date, 
           location, organizer_name, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (event_id, name, description, start_date, end_date,
         location, organizer_name, "draft", now, now)
    )
    await db.commit()

    # Also update the in-memory state
    state_manager.set_event(event)

    # Log the activity
    state_manager.add_activity({
        "agent": "system",
        "action": "event_created",
        "details": f"Event '{name}' created",
    })

    return {"status": "success", "event": event}


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
