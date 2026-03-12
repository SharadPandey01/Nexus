# ============================================================================
# NEXUS BACKEND — LangGraph State Schema
# ============================================================================
# This TypedDict defines the structure of the "State" object that gets
# passed around the LangGraph StateGraph.
# 
# How it works in LangGraph:
# 1. The state starts with initial inputs (user_input).
# 2. Every node (router, agent, evaluator) receives this full state.
# 3. Nodes return a partial dict.
# 4. LangGraph automatically merges the partial dict into the main state.
# ============================================================================

from typing import TypedDict, List, Optional


class NexusState(TypedDict, total=False):
    """
    The shared memory of a single orchestrator run.
    This holds the context required for agents to do their jobs,
    as well as the outputs they generate.
    
    We use total=False so that not every field is required to be
    passed at initialization.
    """
    
    # ---- User Request ----
    user_input: str      # The natural language prompt from the organizer
    request_type: str    # The router's classification (schedule, mail, content, analytics, general)

    # ---- Event Context (Shared Memory / Read-Only for Agents) ----
    event: dict          # Current core event details
    participants: list   # List of all registered participants
    schedule: list       # Current state of the event timeline
    content_queue: list  # All drafted/published content pieces

    # ---- Agent Outputs (Where Agents Write Their Results) ----
    scheduler_output: dict  # Chronos writes its timeline and conflicts here
    mailer_output: dict     # Hermes writes its email drafts and segments here
    content_output: dict    # Apollo writes its social posts here
    analytics_output: dict  # Athena writes its insights and risk flags here
    finance_output: dict    # Fortuna writes her budget and sponsor targets here

    # ---- Coordination & Cascading ----
    pending_tasks: list  # List of tasks triggered by one agent for another
    messages: list       # Inter-agent chat logs for the activity panel
    activity_log: list   # Detailed system events generated during this run

    # ---- Human-in-the-Loop ----
    requires_approval: bool  # Flips to True if an agent requests human review
    approval_items: list     # The actual items needing approval

    # ---- Control Flow variables ----
    next_agent: str          # Evaluator sets this to dictate the graph's next step
    iteration_count: int     # Safety integer to prevent infinite graph loops
    error: str               # Populated if an exception occurs
