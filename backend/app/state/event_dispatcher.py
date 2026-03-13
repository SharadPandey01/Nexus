# ============================================================================
# NEXUS BACKEND — Event Dispatcher
# ============================================================================
# Maps system events to agent triggers.
#
# When something happens (CSV uploaded, schedule changed, etc.),
# the event dispatcher determines which agents should be notified
# and feeds the event into the LangGraph orchestrator.
#
# Event Types (from doc4 Section 4.5):
# - PARTICIPANT_DATA_UPLOADED → Hermes (parse), Athena (analyze)
# - SCHEDULE_CONSTRAINT_CHANGED → Chronos (rebuild), then cascade
# - NEW_SESSION_ADDED → Chronos (fit into schedule)
# - CONTENT_APPROVED → Apollo (move to published queue)
# - EMAIL_APPROVED → Hermes (execute send)
# - EVENT_DETAILS_CHANGED → Apollo (update content), Hermes (update templates)
# - CAPACITY_WARNING → Chronos (suggest room swap)
#
# Usage:
#   from app.state.event_dispatcher import event_dispatcher
#   await event_dispatcher.dispatch("PARTICIPANT_DATA_UPLOADED", data={...})
# ============================================================================

from typing import Any, Dict, List, Optional
from enum import Enum


class EventType(str, Enum):
    """
    All system event types that can trigger agent actions.
    
    Each event maps to one or more agents that should handle it.
    """
    PARTICIPANT_DATA_UPLOADED = "PARTICIPANT_DATA_UPLOADED"
    SCHEDULE_CONSTRAINT_CHANGED = "SCHEDULE_CONSTRAINT_CHANGED"
    NEW_SESSION_ADDED = "NEW_SESSION_ADDED"
    CONTENT_APPROVED = "CONTENT_APPROVED"
    EMAIL_APPROVED = "EMAIL_APPROVED"
    EVENT_DETAILS_CHANGED = "EVENT_DETAILS_CHANGED"
    CAPACITY_WARNING = "CAPACITY_WARNING"


# ============================================================================
# EVENT → AGENT MAPPING
# ============================================================================
# Defines which agents should be triggered for each event type.
# The first agent in the list is the PRIMARY handler;
# subsequent agents are SECONDARY (run after the primary via cascading).
# ============================================================================

EVENT_AGENT_MAP: Dict[str, List[Dict[str, str]]] = {
    EventType.PARTICIPANT_DATA_UPLOADED: [
        {"agent": "hermes", "task": "parse_and_validate_data", "request_type": "mail"},
        {"agent": "athena", "task": "analyze_registrations", "request_type": "analytics"},
        {"agent": "fortuna", "task": "evaluate_sponsor_targets", "request_type": "finance"},
    ],
    EventType.SCHEDULE_CONSTRAINT_CHANGED: [
        {"agent": "chronos", "task": "rebuild_schedule", "request_type": "schedule"},
        # Chronos will cascade to Hermes and Apollo automatically
    ],
    EventType.NEW_SESSION_ADDED: [
        {"agent": "chronos", "task": "fit_session_into_schedule", "request_type": "schedule"},
    ],
    EventType.CONTENT_APPROVED: [
        {"agent": "apollo", "task": "publish_content", "request_type": "content"},
    ],
    EventType.EMAIL_APPROVED: [
        {"agent": "hermes", "task": "send_approved_emails", "request_type": "mail"},
    ],
    EventType.EVENT_DETAILS_CHANGED: [
        {"agent": "apollo", "task": "update_content_for_changes", "request_type": "content"},
        {"agent": "hermes", "task": "update_email_templates", "request_type": "mail"},
    ],
    EventType.CAPACITY_WARNING: [
        {"agent": "chronos", "task": "suggest_room_swap", "request_type": "schedule"},
    ],
    "BUDGET_UPDATED": [
        {"agent": "fortuna", "task": "recalculate_runway", "request_type": "finance"},
    ],
}


class EventDispatcher:
    """
    Dispatches system events to the appropriate agents via the orchestrator.
    
    When an event occurs (e.g., a CSV is uploaded), the dispatcher:
    1. Looks up which agents handle that event
    2. Creates the appropriate orchestrator request
    3. Invokes the LangGraph graph
    4. Streams results via WebSocket
    """

    async def dispatch(
        self,
        event_type: str,
        data: Optional[Dict[str, Any]] = None,
        event_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Dispatch a system event to the appropriate agents.
        
        Args:
            event_type: The type of event (from EventType enum)
            data: Event-specific data payload
            event_id: Which event this relates to
        
        Returns:
            Result from the orchestrator
        """
        # Validate the event type
        if event_type not in EVENT_AGENT_MAP:
            raise ValueError(f"Unknown event type: {event_type}")

        # Get the agent mapping for this event
        agent_targets = EVENT_AGENT_MAP[event_type]
        primary = agent_targets[0]

        # Log the dispatch
        from app.state.state_manager import state_manager
        state_manager.add_activity({
            "agent": "system",
            "action": "event_dispatched",
            "details": f"Event {event_type} dispatched → {primary['agent']} (and {len(agent_targets)-1} more)",
        })

        # Broadcast via WebSocket
        from app.api.websocket import manager
        await manager.broadcast({
            "type": "system_event",
            "data": {
                "event_type": event_type,
                "triggered_agents": [t["agent"] for t in agent_targets],
                "total_agents": len(agent_targets),
            }
        })

        # Build the orchestrator requests for ALL mapped agents
        import asyncio
        from app.agents.orchestrator import run_orchestrator
        
        tasks = []
        for target in agent_targets:
            # We fire an orchestrator job for each agent simultaneously
            tasks.append(run_orchestrator(
                user_input=f"[EVENT: {event_type}] {target['task']}",
                request_type=target["request_type"],
                event=state_manager.get_event(),
                participants=state_manager.get_participants(),
                schedule=state_manager.get_schedule(),
                content_queue=state_manager.get_content_queue(),
            ))

        # Wait for all agents to finish their independent workflows
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return {
            "event_type": event_type,
            "status": "success",
            "results": [{"agent": t["agent"], "result": str(res)} for t, res in zip(agent_targets, results)]
        }

    def get_handlers(self, event_type: str) -> List[Dict[str, str]]:
        """
        Get the list of agents that handle a specific event type.
        
        Args:
            event_type: The event type to look up
        
        Returns:
            List of agent handler dicts
        """
        return EVENT_AGENT_MAP.get(event_type, [])


# ============================================================================
# GLOBAL SINGLETON INSTANCE
# ============================================================================
event_dispatcher = EventDispatcher()
