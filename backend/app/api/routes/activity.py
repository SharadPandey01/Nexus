# ============================================================================
# NEXUS BACKEND — Activity Log API Routes
# ============================================================================
# Endpoint for the Agent Activity panel on the frontend.
# Returns the chronological log of all agent actions, inter-agent messages,
# and system events.
#
# Endpoint:
#   GET /api/activity → Get the activity log
# ============================================================================

from typing import Optional
from fastapi import APIRouter

from app.state.state_manager import state_manager

# Create the router
router = APIRouter()


# ============================================================================
# GET /api/activity — Get the activity log
# ============================================================================

@router.get("/activity")
async def get_activity(
    limit: int = 50,
    agent: Optional[str] = None,
    event_id: Optional[str] = None,
):
    """
    Get the activity log — a chronological record of everything that's
    happened in the system.
    
    This powers the "Agent Activity" panel on the frontend, showing:
    - Agent actions (started working, completed task, etc.)
    - Inter-agent messages (Chronos → Hermes handoff)
    - System events (file uploaded, event created)
    - Organizer decisions (approval/rejection)
    
    Args:
        limit: Max number of entries to return (default: 50)
        agent: Filter by agent name (chronos, hermes, apollo, athena, system)
        event_id: Filter by event ID
    
    Returns:
        List of activity log entries (most recent first)
    """
    # Get from in-memory state first (most up-to-date with live activity)
    activities = state_manager.get_activity_log(limit=limit * 2)  # Get extra for filtering

    # Apply agent filter if provided
    if agent:
        activities = [a for a in activities if a.get("agent") == agent]

    # Limit the results
    activities = activities[:limit]

    if activities:
        return {
            "status": "success",
            "activities": activities,
            "total": len(activities),
        }

    # Fall back to database for historical activity
    from app.database import get_db
    db = await get_db()

    query = "SELECT * FROM agent_logs WHERE 1=1"
    params = []

    if agent:
        query += " AND agent = ?"
        params.append(agent)
    if event_id:
        query += " AND event_id = ?"
        params.append(event_id)

    query += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)

    cursor = await db.execute(query, tuple(params))
    rows = await cursor.fetchall()
    activities = [dict(row) for row in rows]

    return {
        "status": "success",
        "activities": activities,
        "total": len(activities),
    }
