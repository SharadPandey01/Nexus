# ============================================================================
# NEXUS BACKEND — Schedule API Routes
# ============================================================================
# Endpoints for viewing, modifying, and simulating the event schedule.
#
# Endpoints:
#   GET  /api/schedule             → Get the current schedule
#   GET  /api/schedule/sessions    → Alias for above (frontend compat)
#   PUT  /api/schedule/sessions/{id} → Move a session (triggers auto-resolve)
#   POST /api/schedule/optimize    → Bulk conflict resolution via Chronos
#   POST /api/schedule/simulate    → What-if analysis via Chronos
# ============================================================================

import json
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.state.state_manager import state_manager

# Create the router
router = APIRouter()


# ============================================================================
# REQUEST MODELS
# ============================================================================

class SessionMoveRequest(BaseModel):
    """Body for PUT /schedule/sessions/{id} — drag-and-drop move."""
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    venue: Optional[str] = None
    day: Optional[int] = None

class SimulateRequest(BaseModel):
    """Body for POST /schedule/simulate — what-if analysis."""
    description: str


# ============================================================================
# GET /api/schedule — Get the current event schedule
# ============================================================================

@router.get("/schedule")
async def get_schedule(event_id: Optional[str] = None):
    """
    Get the current event schedule.
    Returns all scheduled sessions with their times, rooms, and speakers.
    Checks in-memory state first, then falls back to the database.
    """
    # Try in-memory state first (most up-to-date)
    schedule = state_manager.get_schedule()

    if schedule:
        return schedule  # Return the list directly (frontend expects an array)

    # Fall back to database
    from app.database import get_db
    db = await get_db()

    query = "SELECT * FROM sessions"
    params = ()
    if event_id:
        query += " WHERE event_id = ?"
        params = (event_id,)
    query += " ORDER BY day, start_time"

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    sessions = [dict(row) for row in rows]

    return sessions


# ============================================================================
# GET /api/schedule/sessions — Alias (frontend compatibility)
# ============================================================================

@router.get("/schedule/sessions")
async def get_sessions_alias(event_id: Optional[str] = None):
    """Alias for GET /schedule — the frontend calls this path."""
    return await get_schedule(event_id)


# ============================================================================
# PUT /api/schedule/sessions/{session_id} — Move a session
# ============================================================================

@router.put("/schedule/sessions/{session_id}")
async def move_session(session_id: str, body: SessionMoveRequest):
    """
    Move a session to a new time/room/day (triggered by drag-and-drop).
    
    After applying the move, checks for conflicts. If conflicts exist,
    calls Chronos to auto-resolve them and returns the updated schedule
    with a resolution summary.
    """
    schedule = state_manager.get_schedule() or []

    # ---- Apply the move to the target session ----
    target = None
    for session in schedule:
        if session.get("id") == session_id:
            target = session
            break

    if not target:
        return {"error": "Session not found", "status": "error"}

    # Store old values for context
    old_values = {
        "start_time": target.get("start_time"),
        "end_time": target.get("end_time"),
        "venue": target.get("venue"),
        "day": target.get("day"),
    }

    # Apply updates
    if body.start_time is not None:
        target["start_time"] = body.start_time
    if body.end_time is not None:
        target["end_time"] = body.end_time
    if body.venue is not None:
        target["venue"] = body.venue
    if body.day is not None:
        target["day"] = body.day
    target["status"] = "moved"

    # ---- Detect conflicts ----
    conflicts = _detect_conflicts(schedule)

    if not conflicts:
        # No conflict — update state and return immediately
        state_manager.set_schedule(schedule)

        # Broadcast via WebSocket
        try:
            from app.api.websocket import manager
            await manager.send_agent_status("chronos", "idle", "Session moved — no conflicts")
        except Exception:
            pass

        return {
            "status": "success",
            "schedule": schedule,
            "conflicts_resolved": [],
            "reasoning": f"Session '{target.get('title')}' moved successfully with no conflicts.",
        }

    # ---- Conflicts detected! Call Chronos to auto-resolve ----
    try:
        from app.api.websocket import manager
        await manager.send_agent_status(
            "chronos", "working",
            f"Auto-resolving {len(conflicts)} conflict(s)..."
        )
    except Exception:
        pass

    change_desc = (
        f"Session '{target.get('title')}' was moved from "
        f"{old_values['venue']} {old_values['start_time']}-{old_values['end_time']} Day {old_values['day']} "
        f"to {target.get('venue')} {target.get('start_time')}-{target.get('end_time')} Day {target.get('day')}. "
        f"This created {len(conflicts)} conflict(s): {json.dumps(conflicts)}. "
        f"Resolve ALL conflicts by moving the LOWER priority sessions while keeping the dragged session in place."
    )

    from app.agents.chronos import chronos_agent

    event = state_manager.get_event() or {}
    result = await chronos_agent({
        "user_input": change_desc,
        "event": event,
        "participants": state_manager.get_participants() if hasattr(state_manager, "get_participants") else [],
        "schedule": schedule,
        "pending_tasks": [],
    })

    output = result.get("scheduler_output", {})

    # Update schedule with resolved timeline
    resolved_timeline = output.get("timeline", schedule)
    if resolved_timeline:
        state_manager.set_schedule(resolved_timeline)

    # Persist approvals if any
    approval_items = output.get("approval_items", [])
    if approval_items:
        import asyncio
        from app.repository import insert_approval
        
        event = state_manager.get_event()
        event_id = event.get("id", "default") if event else "default"
        
        insert_tasks = []
        for item in approval_items:
            item["event_id"] = event_id
            state_manager.add_approval(item)
            insert_tasks.append(insert_approval(event_id, item))
            
        if insert_tasks:
            await asyncio.gather(*insert_tasks)
            
        try:
            from app.api.websocket import manager
            await manager.send_approval_request(approval_items)
        except Exception:
            pass

    try:
        from app.api.websocket import manager
        await manager.send_agent_status("chronos", "idle", "Conflicts resolved")
    except Exception:
        pass

    return {
        "status": "resolved",
        "schedule": resolved_timeline,
        "conflicts_resolved": output.get("conflicts_resolved", []),
        "reasoning": output.get("reasoning", ""),
        "warnings": output.get("warnings", []),
        "cascade_to": output.get("cascade_to", []),
        "approval_items": approval_items,
    }


# ============================================================================
# POST /api/schedule/optimize — Bulk conflict resolution
# ============================================================================

@router.post("/schedule/optimize")
async def optimize_schedule():
    """
    Ask Chronos to analyze the entire schedule and resolve all conflicts.
    """
    schedule = state_manager.get_schedule() or []

    if not schedule:
        return {"status": "empty", "message": "No schedule to optimize."}

    try:
        from app.api.websocket import manager
        await manager.send_agent_status("chronos", "working", "Optimizing full schedule...")
    except Exception:
        pass

    from app.agents.chronos import chronos_agent

    event = state_manager.get_event() or {}
    result = await chronos_agent({
        "user_input": "Analyze the current schedule for ALL conflicts (room overlaps, speaker double-bookings, time violations, capacity issues). Resolve every conflict. Minimize disruption.",
        "event": event,
        "participants": [],
        "schedule": schedule,
        "pending_tasks": [],
    })

    output = result.get("scheduler_output", {})
    resolved_timeline = output.get("timeline", schedule)
    if resolved_timeline:
        state_manager.set_schedule(resolved_timeline)

    try:
        from app.api.websocket import manager
        await manager.send_agent_status("chronos", "idle", "Optimization complete")
    except Exception:
        pass

    return {
        "status": "success",
        "schedule": resolved_timeline,
        "conflicts_resolved": len(output.get("conflicts_resolved", [])),
        "changes_made": [r.get("action_taken", "") for r in output.get("conflicts_resolved", [])],
        "reasoning": output.get("reasoning", ""),
        "warnings": output.get("warnings", []),
    }


# ============================================================================
# POST /api/schedule/simulate — What-if analysis
# ============================================================================

@router.post("/schedule/simulate")
async def simulate_schedule(body: SimulateRequest):
    """
    Simulate a schedule change WITHOUT committing.
    Chronos analyzes the proposed change and returns impacts, conflicts,
    and reasoning so the organizer can decide before acting.
    """
    schedule = state_manager.get_schedule() or []

    try:
        from app.api.websocket import manager
        await manager.send_agent_status("chronos", "working", f"Simulating: {body.description[:60]}...")
    except Exception:
        pass

    from app.agents.chronos import chronos_agent

    event = state_manager.get_event() or {}
    sim_input = (
        f"WHAT-IF ANALYSIS (DO NOT COMMIT CHANGES):\n"
        f"The organizer asks: \"{body.description}\"\n\n"
        f"Analyze this proposed change against the current schedule. Report:\n"
        f"1. What conflicts would arise\n"
        f"2. How you would resolve them\n"
        f"3. How many participants would be affected\n"
        f"4. Your recommendation (do it, don't do it, or do it with modifications)\n\n"
        f"Use action: \"what_if_analysis\" in your response."
    )

    result = await chronos_agent({
        "user_input": sim_input,
        "event": event,
        "participants": [],
        "schedule": schedule,
        "pending_tasks": [],
    })

    output = result.get("scheduler_output", {})

    try:
        from app.api.websocket import manager
        await manager.send_agent_status("chronos", "idle", "Simulation complete")
    except Exception:
        pass

    return {
        "status": "success",
        "simulation": {
            "proposed_change": body.description,
            "conflicts_detected": output.get("conflicts_found", []),
            "resolution_plan": output.get("conflicts_resolved", []),
            "affected_sessions": len(output.get("timeline", [])),
            "warnings": output.get("warnings", []),
            "reasoning": output.get("reasoning", ""),
            "cascade_to": output.get("cascade_to", []),
        },
    }


# ============================================================================
# HELPER — Conflict detection (lightweight, no LLM needed)
# ============================================================================

def _detect_conflicts(schedule: list) -> list:
    """
    Simple heuristic conflict detection.
    Checks for room+time overlaps and speaker double-bookings.
    Returns a list of conflict descriptions.
    """
    conflicts = []
    n = len(schedule)

    for i in range(n):
        for j in range(i + 1, n):
            a, b = schedule[i], schedule[j]

            # Skip breaks
            if a.get("session_type") == "break" or b.get("session_type") == "break":
                continue

            # Must be same day
            if a.get("day") != b.get("day"):
                continue

            # Check time overlap
            a_start = a.get("start_time", "00:00")
            a_end = a.get("end_time", "00:00")
            b_start = b.get("start_time", "00:00")
            b_end = b.get("end_time", "00:00")

            times_overlap = a_start < b_end and b_start < a_end

            if not times_overlap:
                continue

            # Room overlap
            if a.get("venue") and a.get("venue") == b.get("venue"):
                conflicts.append({
                    "type": "room_overlap",
                    "description": f"'{a.get('title')}' and '{b.get('title')}' both in {a.get('venue')} at overlapping times on Day {a.get('day')}",
                    "sessions": [a.get("id"), b.get("id")],
                })

            # Speaker double-booking
            if a.get("speaker") and a.get("speaker") == b.get("speaker") and a.get("speaker") != "":
                conflicts.append({
                    "type": "speaker_double_booking",
                    "description": f"Speaker '{a.get('speaker')}' is double-booked: '{a.get('title')}' and '{b.get('title')}' at overlapping times on Day {a.get('day')}",
                    "sessions": [a.get("id"), b.get("id")],
                })

    return conflicts
