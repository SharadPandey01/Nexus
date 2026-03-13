# ============================================================================
# NEXUS BACKEND — LangGraph Orchestrator
# ============================================================================
# This is the BRAIN of the entire system.
#
# It defines a LangGraph StateGraph that:
# 1. Receives a request (from API or event trigger)
# 2. ROUTES it to the right agent (Chronos, Hermes, Apollo, Athena)
# 3. Executes the agent
# 4. EVALUATES the result — checks if cascading work is needed
# 5. If yes, LOOPS back to route to the next agent
# 6. If no, returns the final result
#
# This is what makes the system truly multi-agent:
# - It's not a pipeline (A → B → C)
# - It's a GRAPH that can loop dynamically
# - The evaluator decides at runtime which agent runs next
#
# Architecture:
#   Router → Agent → Evaluator → (loop back to Router OR end)
#
# Usage:
#   from app.agents.orchestrator import run_orchestrator
#   result = await run_orchestrator(user_input="...", request_type="schedule")
# ============================================================================

from typing import Any, Dict, List, Optional
from datetime import datetime

# LangGraph imports for building the state graph
from langgraph.graph import StateGraph, END

# Import mock agent stubs (will be replaced with real LLM agents)
from app.agents.stubs import (
    mailer_agent_stub,
    analytics_agent_stub,
    fortuna_agent_stub,
)

# Real LLM-powered agents (replace stubs)
from app.agents.apollo import apollo_agent
from app.agents.chronos import chronos_agent

# Import WebSocket manager for real-time streaming
from app.api.websocket import manager as ws_manager

# Import state manager for reading/writing shared state
from app.state.state_manager import state_manager


# ============================================================================
# NEXUS STATE — The shared state object passed through the graph
# ============================================================================
# Every node (router, agent, evaluator) receives this state as input
# and returns a PARTIAL update. LangGraph merges the update into the
# full state automatically.
#
# This is a TypedDict — Python's way of defining a dict with known keys.
# ============================================================================

from typing import TypedDict, Annotated


class NexusState(TypedDict, total=False):
    """
    The shared state object that all agents read from and write to.
    
    This is the "working memory" of a single orchestrator run.
    """
    # ---- User Request ----
    user_input: str          # The organizer's request (natural language)
    request_type: str        # Classified type: schedule, mail, content, analytics, general

    # ---- Event Context (read by all agents) ----
    event: dict              # Current event configuration
    participants: list       # Participant list
    schedule: list           # Current schedule
    content_queue: list      # Current content queue

    # ---- Agent Outputs (each agent writes its result here) ----
    scheduler_output: dict   # Output from Chronos (Scheduler Agent)
    mailer_output: dict      # Output from Hermes (Mail Agent)
    content_output: dict     # Output from Apollo (Content Agent)
    analytics_output: dict   # Output from Athena (Analytics Agent)
    finance_output: dict     # Output from Fortuna (Finance Agent)

    # ---- Cascading / Coordination ----
    pending_tasks: list      # Tasks that need another agent to handle
    messages: list           # Inter-agent messages for the activity panel
    activity_log: list       # Log entries generated during this run

    # ---- Human-in-the-Loop ----
    requires_approval: bool  # Does the current result need organizer approval?
    approval_items: list     # Items pending approval

    # ---- Control Flow ----
    next_agent: str          # Which agent runs next (set by evaluator)
    iteration_count: int     # Safety counter to prevent infinite loops (max 10)
    error: str               # Error message if something went wrong


# ============================================================================
# ROUTER NODE — Decides which agent to call
# ============================================================================

async def route_request(state: NexusState) -> dict:
    """
    Router node — classifies the request and decides which agent handles it.
    
    This is the ENTRY POINT of the graph. It receives the user's request
    and determines the routing based on:
    1. Explicit request_type (if provided by the API)
    2. If there are pending cascading tasks from a previous agent
    3. Keyword analysis of the user input (fallback)
    
    Returns:
        Partial state update with the classified request_type
    """
    # If there are pending cascading tasks, handle those
    pending = state.get("pending_tasks", [])
    if pending:
        next_task = pending[0]
        # Stream activity to frontend
        await ws_manager.send_agent_message(
            from_agent=next_task.get("from", "system"),
            to_agent=next_task["target_agent"],
            content=f"Cascading task: {next_task.get('task', 'processing')}"
        )
        return {"request_type": _agent_to_type(next_task["target_agent"])}

    # Classify the request type
    request_type = state.get("request_type", "")
    user_input = state.get("user_input", "").lower()

    if not request_type or request_type == "general":
        # Auto-classify based on keywords in the user input
        request_type = _classify_request(user_input)

    # Log the routing decision
    await ws_manager.send_agent_status(
        "system", "working",
        f"Routing to {_type_to_agent(request_type)} agent..."
    )

    return {"request_type": request_type}


def _classify_request(user_input: str) -> str:
    """
    Classify the user's request into a type based on keywords.
    
    This is a simple keyword-based classifier. In production, you'd use
    the LLM to classify — but for the hackathon, this is fast and reliable.
    
    Args:
        user_input: The user's natural language request (lowercased)
    
    Returns:
        One of: schedule, mail, content, analytics, general
    """
    # Keyword mapping — order matters (first match wins)
    schedule_keywords = ["schedule", "timeline", "session", "conflict", "slot", "room", "venue", "speaker time"]
    mail_keywords = ["email", "mail", "send", "notification", "csv", "participant", "invite", "remind"]
    content_keywords = ["content", "social", "post", "campaign", "marketing", "promote", "tweet", "linkedin"]
    analytics_keywords = ["analytics", "insight", "report", "trend", "capacity", "risk", "summary", "metric"]
    finance_keywords = ["budget", "finance", "sponsor", "revenue", "cost", "money", "spend", "ticket"]

    if any(kw in user_input for kw in schedule_keywords):
        return "schedule"
    elif any(kw in user_input for kw in mail_keywords):
        return "mail"
    elif any(kw in user_input for kw in content_keywords):
        return "content"
    elif any(kw in user_input for kw in analytics_keywords):
        return "analytics"
    elif any(kw in user_input for kw in finance_keywords):
        return "finance"
    else:
        return "general"  # Default to general (router will pick scheduler)


def _type_to_agent(request_type: str) -> str:
    """Map request type to agent name."""
    return {
        "schedule": "chronos",
        "mail": "hermes",
        "content": "apollo",
        "analytics": "athena",
        "finance": "fortuna",
        "general": "chronos",  # Default to scheduler
    }.get(request_type, "chronos")


def _agent_to_type(agent_name: str) -> str:
    """Map agent name to request type."""
    return {
        "chronos": "schedule",
        "hermes": "mail",
        "apollo": "content",
        "athena": "analytics",
        "fortuna": "finance",
    }.get(agent_name, "general")


# ============================================================================
# DECIDE AGENT — Conditional edge function
# ============================================================================

def decide_agent(state: NexusState) -> str:
    """
    Conditional edge function — decides which agent node to execute next.
    
    Called after the router. Returns the name of the next node in the graph.
    """
    # Check for pending cascading tasks first
    pending = state.get("pending_tasks", [])
    if pending:
        return pending[0]["target_agent"]

    # Route based on request type
    request_type = state.get("request_type", "general")
    routing = {
        "schedule": "chronos",
        "mail": "hermes",
        "content": "apollo",
        "analytics": "athena",
        "finance": "fortuna",
        "general": "chronos",  # Default
    }
    return routing.get(request_type, "chronos")


# ============================================================================
# AGENT NODES — Wrapper functions for each agent
# ============================================================================
# These wrap the agent stubs (or real agents) with WebSocket streaming
# and state management. The actual agent logic lives in stubs.py
# (and will be replaced by the remote AI dev with real LLM agents).
# ============================================================================

async def chronos_node(state: NexusState) -> dict:
    """Execute the Scheduler Agent (Chronos)."""
    # Notify frontend that Chronos is working
    await ws_manager.send_agent_status("chronos", "working", "Processing schedule request...")
    state_manager.update_agent_status("chronos", "working", "Processing schedule request")

    try:
        # Call the agent (stub for now)
        result = await chronos_agent(state)

        # Notify frontend that Chronos is done
        await ws_manager.send_agent_complete("chronos", result.get("scheduler_output", {}))
        state_manager.update_agent_status("chronos", "done", "Schedule processing complete")

        # Log the activity
        state_manager.add_activity({
            "agent": "chronos",
            "action": "schedule_processed",
            "details": result.get("scheduler_output", {}).get("reasoning", "Schedule processed"),
        })

        return result

    except Exception as e:
        await ws_manager.send_error("chronos", str(e))
        state_manager.update_agent_status("chronos", "error", str(e))
        return {"error": str(e)}


async def hermes_node(state: NexusState) -> dict:
    """Execute the Mail Agent (Hermes)."""
    await ws_manager.send_agent_status("hermes", "working", "Processing mail request...")
    state_manager.update_agent_status("hermes", "working", "Processing mail request")

    try:
        result = await mailer_agent_stub(state)
        await ws_manager.send_agent_complete("hermes", result.get("mailer_output", {}))
        state_manager.update_agent_status("hermes", "done", "Mail processing complete")

        state_manager.add_activity({
            "agent": "hermes",
            "action": "mail_processed",
            "details": result.get("mailer_output", {}).get("reasoning", "Mail processed"),
        })

        return result

    except Exception as e:
        await ws_manager.send_error("hermes", str(e))
        state_manager.update_agent_status("hermes", "error", str(e))
        return {"error": str(e)}


async def apollo_node(state: NexusState) -> dict:
    """Execute the Content Agent (Apollo)."""
    await ws_manager.send_agent_status("apollo", "working", "Generating content...")
    state_manager.update_agent_status("apollo", "working", "Generating content")

    try:
        result = await apollo_agent(state)
        await ws_manager.send_agent_complete("apollo", result.get("content_output", {}))
        state_manager.update_agent_status("apollo", "done", "Content generation complete")

        state_manager.add_activity({
            "agent": "apollo",
            "action": "content_generated",
            "details": result.get("content_output", {}).get("reasoning", "Content generated"),
        })

        return result

    except Exception as e:
        await ws_manager.send_error("apollo", str(e))
        state_manager.update_agent_status("apollo", "error", str(e))
        return {"error": str(e)}


async def athena_node(state: NexusState) -> dict:
    """Execute the Analytics Agent (Athena)."""
    await ws_manager.send_agent_status("athena", "working", "Analyzing data...")
    state_manager.update_agent_status("athena", "working", "Analyzing data")

    try:
        result = await analytics_agent_stub(state)
        await ws_manager.send_agent_complete("athena", result.get("analytics_output", {}))
        state_manager.update_agent_status("athena", "done", "Analysis complete")

        state_manager.add_activity({
            "agent": "athena",
            "action": "analysis_complete",
            "details": result.get("analytics_output", {}).get("reasoning", "Analysis complete"),
        })

        return result

    except Exception as e:
        await ws_manager.send_error("athena", str(e))
        state_manager.update_agent_status("athena", "error", str(e))
        return {"error": str(e)}


async def fortuna_node(state: NexusState) -> dict:
    """Execute the Finance Agent (Fortuna)."""
    await ws_manager.send_agent_status("fortuna", "working", "Analyzing budget and sponsors...")
    state_manager.update_agent_status("fortuna", "working", "Analyzing budget and sponsors")

    try:
        result = await fortuna_agent_stub(state)
        await ws_manager.send_agent_complete("fortuna", result.get("finance_output", {}))
        state_manager.update_agent_status("fortuna", "done", "Financial analysis complete")

        state_manager.add_activity({
            "agent": "fortuna",
            "action": "finance_processed",
            "details": result.get("finance_output", {}).get("reasoning", "Financial analysis complete"),
        })

        return result

    except Exception as e:
        await ws_manager.send_error("fortuna", str(e))
        state_manager.update_agent_status("fortuna", "error", str(e))
        return {"error": str(e)}


# ============================================================================
# EVALUATOR NODE — Checks if cascading work is needed
# ============================================================================

async def evaluate_and_cascade(state: NexusState) -> dict:
    """
    Evaluator node — the KEY to true multi-agent orchestration.
    
    After an agent finishes, this node checks:
    1. Did the agent emit cascading tasks? (e.g., Chronos → Hermes)
    2. Does the result require organizer approval?
    3. Have we exceeded the iteration limit? (prevent infinite loops)
    
    If cascading is needed, it routes back to the router → next agent.
    If done, it signals the graph to end.
    """
    pending = list(state.get("pending_tasks", []))

    # Remove the task that was just completed (pop from front)
    if pending:
        completed_task = pending.pop(0)

    # Check the last agent's output for new cascading tasks
    for output_key in ["scheduler_output", "mailer_output", "content_output", "analytics_output", "finance_output"]:
        output = state.get(output_key)
        if output and output.get("cascade_to"):
            for cascade in output["cascade_to"]:
                # Add each cascading task to the pending queue
                pending.append({
                    "target_agent": cascade["agent"],
                    "task": cascade.get("task", "cascading"),
                    "data": cascade.get("data", {}),
                    "from": output_key.replace("_output", ""),  # e.g., "scheduler"
                })
                # Stream the inter-agent handoff to the frontend
                await ws_manager.send_agent_message(
                    from_agent=output_key.replace("_output", ""),
                    to_agent=cascade["agent"],
                    content=f"Handoff: {cascade.get('task', 'processing')}",
                )

    # Check if the last agent needs approval
    for output_key in ["scheduler_output", "mailer_output", "content_output", "finance_output"]:
        output = state.get(output_key)
        if output and output.get("requires_approval"):
            approval_items = output.get("approval_items", [])
            
            # Persist each approval item to the database and state manager
            event = state_manager.get_event()
            event_id = event.get("id", "default") if event else "default"
            from app.repository import insert_approval
            import asyncio
            
            # Fire all DB inserts concurrently
            insert_tasks = []
            for item in approval_items:
                item["event_id"] = event_id
                state_manager.add_approval(item)
                insert_tasks.append(insert_approval(event_id, item))
                
            if insert_tasks:
                await asyncio.gather(*insert_tasks)

            # Send approval request to frontend
            await ws_manager.send_approval_request(approval_items)
            return {
                "pending_tasks": pending,
                "requires_approval": True,
                "approval_items": approval_items,
            }

    # Safety: prevent infinite loops (max 10 iterations)
    iteration = state.get("iteration_count", 0)
    if iteration > 10:
        await ws_manager.send_error("system", "Max iterations reached — stopping to prevent infinite loop")
        return {"pending_tasks": [], "next_agent": None, "iteration_count": iteration}

    return {
        "pending_tasks": pending,
        "iteration_count": iteration + 1,
    }


def decide_next_step(state: NexusState) -> str:
    """
    Conditional edge function — determines what happens after evaluation.
    
    Returns:
        "chronos", "hermes", "apollo", "athena" → route to that agent
        "done" → end the graph
        "approval_needed" → pause for human approval
    """
    # If approval is needed, pause the graph
    if state.get("requires_approval"):
        return "approval_needed"

    # If there are more pending tasks, route to the next agent
    if state.get("pending_tasks"):
        next_agent = state["pending_tasks"][0]["target_agent"]
        return next_agent

    # All done!
    return "done"


# ============================================================================
# BUILD THE GRAPH — Assemble all nodes and edges
# ============================================================================

def build_nexus_graph() -> StateGraph:
    """
    Build and compile the LangGraph StateGraph.
    
    The graph structure:
    
        router → (conditional) → chronos/hermes/apollo/athena
                                       ↓
                                   evaluator
                                       ↓
                              (conditional) → loop back OR end
    
    Returns:
        Compiled StateGraph ready to invoke
    """
    # Create the graph with our state schema
    graph = StateGraph(NexusState)

    # ---- Add nodes (processing steps) ----
    graph.add_node("router", route_request)
    graph.add_node("chronos", chronos_node)
    graph.add_node("hermes", hermes_node)
    graph.add_node("apollo", apollo_node)
    graph.add_node("athena", athena_node)
    graph.add_node("fortuna", fortuna_node)
    graph.add_node("evaluator", evaluate_and_cascade)

    # ---- Set the entry point ----
    graph.set_entry_point("router")

    # ---- Router → Agent (conditional edge) ----
    # After routing, decide which agent to call
    graph.add_conditional_edges(
        "router",       # Source node
        decide_agent,   # Function that returns the next node name
        {
            # Map of possible return values → target nodes
            "chronos": "chronos",
            "hermes": "hermes",
            "apollo": "apollo",
            "athena": "athena",
            "fortuna": "fortuna",
        }
    )

    # ---- Each Agent → Evaluator (fixed edges) ----
    # After any agent finishes, always go to the evaluator
    for agent_name in ["chronos", "hermes", "apollo", "athena", "fortuna"]:
        graph.add_edge(agent_name, "evaluator")

    # ---- Evaluator → Next step (conditional edge) ----
    # After evaluation, either loop back or end
    graph.add_conditional_edges(
        "evaluator",
        decide_next_step,
        {
            "chronos": "chronos",
            "hermes": "hermes",
            "apollo": "apollo",
            "athena": "athena",
            "fortuna": "fortuna",
            "done": END,
            "approval_needed": END,  # Pause for human approval
        }
    )

    # ---- Compile and return ----
    return graph.compile()


# ============================================================================
# COMPILED GRAPH INSTANCE
# ============================================================================
# Created once, reused for every invocation.
# ============================================================================
nexus_graph = build_nexus_graph()


# ============================================================================
# RUN ORCHESTRATOR — Main entry point called by the API
# ============================================================================

async def run_orchestrator(
    user_input: str,
    request_type: Optional[str] = None,
    event: Optional[dict] = None,
    participants: Optional[list] = None,
    schedule: Optional[list] = None,
    content_queue: Optional[list] = None,
) -> Dict[str, Any]:
    """
    Run the LangGraph orchestrator with the given input.
    
    This is the main function called by the /api/agents/invoke endpoint.
    It creates the initial state, invokes the graph, and returns the result.
    
    Args:
        user_input: The organizer's request
        request_type: Optional hint for routing
        event: Current event config
        participants: Current participant list
        schedule: Current schedule
        content_queue: Current content queue
    
    Returns:
        The final state after all agents have finished
    """
    # Build the initial state
    initial_state: NexusState = {
        "user_input": user_input,
        "request_type": request_type or "general",
        "event": event or {},
        "participants": participants or [],
        "schedule": schedule or [],
        "content_queue": content_queue or [],
        "scheduler_output": {},
        "mailer_output": {},
        "content_output": {},
        "analytics_output": {},
        "finance_output": {},
        "pending_tasks": [],
        "messages": [],
        "activity_log": [],
        "requires_approval": False,
        "approval_items": [],
        "next_agent": None,
        "iteration_count": 0,
        "error": "",
    }

    # Invoke the graph
    try:
        # ainvoke runs the graph asynchronously
        result = await nexus_graph.ainvoke(initial_state)
        return result
    except Exception as e:
        await ws_manager.send_error("system", f"Orchestrator error: {str(e)}")
        raise
