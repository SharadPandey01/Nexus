# ============================================================================
# NEXUS BACKEND — Agent Invoke API Routes
# ============================================================================
# The main endpoint that sends requests into the LangGraph orchestrator.
# This is how the frontend triggers AI agent actions.
#
# Endpoint:
#   POST /api/agents/invoke → Send a request to the AI system
#
# The request flows through:
#   Frontend → API → LangGraph Orchestrator → Router → Agent(s) → Response
# ============================================================================

from typing import Optional
from fastapi import APIRouter, HTTPException

from app.state.state_manager import state_manager

# Create the router — mounted in main.py under /api prefix
router = APIRouter()


# ============================================================================
# POST /api/agents/invoke — Invoke the AI agent system
# ============================================================================

@router.post("/agents/invoke")
async def invoke_agents(
    user_input: str,
    request_type: Optional[str] = None,
    event_id: Optional[str] = None,
):
    """
    Send a request into the LangGraph multi-agent orchestrator.
    
    The orchestrator will:
    1. Route the request to the appropriate agent(s)
    2. Execute agent logic (with LLM calls)
    3. Handle cascading (agent A triggers agent B)
    4. Stream activity updates via WebSocket
    5. Return the final result
    
    Args:
        user_input: Natural language request from the organizer
                   e.g., "Create a 3-day hackathon schedule"
        request_type: Hint for routing (schedule, mail, content, analytics, general)
                     If not provided, the router will classify automatically
        event_id: Which event this request relates to (optional)
    
    Returns:
        The final result from the orchestrator (agent outputs, activity log, etc.)
    """
    # Validate input
    if not user_input or not user_input.strip():
        raise HTTPException(status_code=400, detail="user_input is required")

    # Get the current event context
    event = state_manager.get_event()

    # Log that we're starting an agent invocation
    state_manager.add_activity({
        "agent": "system",
        "action": "agent_invocation_started",
        "details": f"Processing request: '{user_input[:100]}...' (type: {request_type or 'auto'})",
    })

    # Broadcast agent activity via WebSocket
    from app.api.websocket import manager
    await manager.send_agent_status("system", "working", f"Processing: {user_input[:80]}...")

    try:
        # ---- Run the LangGraph orchestrator ----
        from app.agents.orchestrator import run_orchestrator
        result = await run_orchestrator(
            user_input=user_input,
            request_type=request_type,
            event=event,
            participants=state_manager.get_participants(),
            schedule=state_manager.get_schedule(),
            content_queue=state_manager.get_content_queue(),
        )

        # Broadcast completion
        await manager.send_agent_status("system", "done", "Request processed")

        # Log the completion
        state_manager.add_activity({
            "agent": "system",
            "action": "agent_invocation_complete",
            "details": f"Completed request: '{user_input[:80]}...'",
        })

        return {
            "status": "success",
            "result": result,
        }

    except Exception as e:
        # Log and broadcast the error
        error_msg = str(e)
        state_manager.add_activity({
            "agent": "system",
            "action": "agent_invocation_error",
            "details": f"Error processing request: {error_msg}",
        })
        await manager.send_error("system", error_msg)

        raise HTTPException(status_code=500, detail=f"Agent invocation failed: {error_msg}")


# ============================================================================
# GET /api/agents/status — Get current status of all agents
# ============================================================================

@router.get("/agents/status")
async def get_agent_statuses():
    """
    Get the current status of all agents.
    
    Returns:
        Dict of agent name → status info (status, last_task, last_active)
    """
    return {
        "status": "success",
        "agents": state_manager.get_all_agent_statuses(),
    }
