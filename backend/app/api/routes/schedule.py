# ============================================================================
# NEXUS BACKEND — Schedule API Routes
# ============================================================================
# Endpoints for viewing and simulating the event schedule.
#
# Endpoints:
#   GET  /api/schedule          → Get the current schedule
#   POST /api/schedule/simulate → What-if simulation
# ============================================================================

from typing import Optional
from fastapi import APIRouter

from app.state.state_manager import state_manager

# Create the router
router = APIRouter()


# ============================================================================
# GET /api/schedule — Get the current event schedule
# ============================================================================

@router.get("/schedule")
async def get_schedule(event_id: Optional[str] = None):
    """
    Get the current event schedule.
    
    Returns all scheduled sessions with their times, rooms, and speakers.
    Also checks in-memory state first, then falls back to the database.
    """
    # Try in-memory state first (most up-to-date)
    schedule = state_manager.get_schedule()
    
    if schedule:
        return {
            "status": "success",
            "schedule": schedule,
            "total_sessions": len(schedule),
        }

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

    return {
        "status": "success",
        "schedule": sessions,
        "total_sessions": len(sessions),
    }


# ============================================================================
# POST /api/schedule/simulate — What-if simulation
# ============================================================================

@router.post("/schedule/simulate")
async def simulate_schedule(
    change_description: str,
    session_id: Optional[str] = None,
    new_time: Optional[str] = None,
    new_venue: Optional[str] = None,
):
    """
    Simulate a schedule change WITHOUT committing it.
    
    The organizer can ask "what happens if I move this session?" and
    see the cascading effects before deciding to actually do it.
    
    This calls the Scheduler Agent in simulation mode — it analyzes
    the proposed change and returns:
    - What conflicts would arise
    - How they would be resolved
    - How many participants would be affected
    - What notifications would need to be sent
    
    Args:
        change_description: Natural language description of the change
        session_id: ID of the session to modify (optional)
        new_time: Proposed new time (optional)
        new_venue: Proposed new venue (optional)
    
    Returns:
        Simulation result with predicted impacts
    """
    # For now, return a mock simulation result
    # Will be connected to the Scheduler Agent's what-if analysis
    from app.api.websocket import manager
    await manager.send_agent_status("chronos", "working", f"Simulating: {change_description[:60]}...")

    # TODO: Connect to actual LangGraph orchestrator in simulation mode
    simulation_result = {
        "proposed_change": change_description,
        "conflicts_detected": [],
        "affected_sessions": [],
        "affected_participants": 0,
        "notifications_needed": [],
        "recommendation": "Simulation mode — connect to Scheduler Agent for real analysis",
    }

    await manager.send_agent_status("chronos", "idle")

    return {
        "status": "success",
        "simulation": simulation_result,
    }
