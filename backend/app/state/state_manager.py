# ============================================================================
# NEXUS BACKEND — State Manager
# ============================================================================
# In-memory singleton that holds the current state of the system.
#
# This is the "working memory" — fast access to current event data,
# participant lists, schedule, content queue, and agent activity.
#
# The database (SQLite) is the "long-term memory" — persists across restarts.
# The state manager syncs to/from the database as needed.
#
# Usage:
#   from app.state.state_manager import state_manager
#   state_manager.get_event()
#   state_manager.update_schedule(new_schedule)
# ============================================================================

from typing import Any, Dict, List, Optional
from datetime import datetime


class StateManager:
    """
    Singleton in-memory state manager for the Nexus system.
    
    Holds the current "working state" of the system including:
    - Current event configuration
    - Participant list
    - Schedule
    - Content queue
    - Agent activity/status
    - Pending approvals
    
    This state is the same data that gets passed into LangGraph's NexusState.
    """

    def __init__(self):
        """Initialize with empty state. Call initialize() on startup."""
        self._state: Dict[str, Any] = {}
        self._initialized: bool = False

    def initialize(self):
        """
        Set up the initial empty state structure.
        Called once during server startup (from main.py lifespan).
        """
        self._state = {
            # ---- Event Data ----
            # The current event being managed
            "event": None,  # Will hold the event dict when created

            # ---- Participants ----
            # Clean, validated participant data from CSV upload
            "participants": [],  # List of participant dicts

            # ---- Schedule ----
            # Current event schedule (list of sessions with times/rooms)
            "schedule": [],  # List of scheduled session dicts

            # ---- Content Queue ----
            # Generated content awaiting approval
            "content_queue": [],  # List of content piece dicts

            # ---- Agent Status ----
            # Current status of each agent (idle, working, done, error)
            "agent_status": {
                "chronos": {"status": "idle", "last_task": None, "last_active": None},
                "hermes": {"status": "idle", "last_task": None, "last_active": None},
                "apollo": {"status": "idle", "last_task": None, "last_active": None},
                "athena": {"status": "idle", "last_task": None, "last_active": None},
                "fortuna": {"status": "idle", "last_task": None, "last_active": None},
            },

            # ---- Activity Log ----
            # In-memory log of recent agent actions (also persisted to DB)
            "activity_log": [],  # List of activity dicts (most recent first)

            # ---- Pending Approvals ----
            # Items waiting for organizer approval
            "pending_approvals": [],  # List of approval item dicts

            # ---- Inter-Agent Messages ----
            # Recent messages between agents (for the activity panel)
            "agent_messages": [],  # List of message dicts
        }
        self._initialized = True

    # ========================================================================
    # GETTERS — Read state
    # ========================================================================

    def get_state(self) -> Dict[str, Any]:
        """Get the entire current state (used to populate LangGraph NexusState)."""
        self._check_initialized()
        return self._state.copy()

    def get_event(self) -> Optional[Dict]:
        """Get the current event configuration."""
        self._check_initialized()
        return self._state.get("event")

    def get_participants(self) -> List[Dict]:
        """Get the current participant list."""
        self._check_initialized()
        return self._state.get("participants", [])

    def get_schedule(self) -> List[Dict]:
        """Get the current schedule."""
        self._check_initialized()
        return self._state.get("schedule", [])

    def get_content_queue(self) -> List[Dict]:
        """Get the current content queue."""
        self._check_initialized()
        return self._state.get("content_queue", [])

    def get_agent_status(self, agent_name: str) -> Dict:
        """Get the current status of a specific agent."""
        self._check_initialized()
        return self._state.get("agent_status", {}).get(agent_name, {"status": "unknown"})

    def get_all_agent_statuses(self) -> Dict:
        """Get the status of all agents."""
        self._check_initialized()
        return self._state.get("agent_status", {})

    def get_activity_log(self, limit: int = 50) -> List[Dict]:
        """Get the most recent activity log entries."""
        self._check_initialized()
        return self._state.get("activity_log", [])[:limit]

    def get_pending_approvals(self) -> List[Dict]:
        """Get all pending approval items."""
        self._check_initialized()
        return self._state.get("pending_approvals", [])

    # ========================================================================
    # SETTERS — Update state
    # ========================================================================

    def set_event(self, event: Dict):
        """Set or update the current event configuration."""
        self._check_initialized()
        self._state["event"] = event

    def set_participants(self, participants: List[Dict]):
        """Replace the entire participant list."""
        self._check_initialized()
        self._state["participants"] = participants

    def add_participants(self, new_participants: List[Dict]):
        """Add participants to the existing list."""
        self._check_initialized()
        self._state["participants"].extend(new_participants)

    def set_schedule(self, schedule: List[Dict]):
        """Replace the entire schedule."""
        self._check_initialized()
        self._state["schedule"] = schedule

    def set_content_queue(self, content: List[Dict]):
        """Replace the entire content queue."""
        self._check_initialized()
        self._state["content_queue"] = content

    def add_content(self, content_piece: Dict):
        """Add a single content piece to the queue."""
        self._check_initialized()
        self._state["content_queue"].append(content_piece)

    def update_agent_status(self, agent_name: str, status: str, task: str = None):
        """
        Update the status of a specific agent.
        
        Args:
            agent_name: Name of the agent (chronos, hermes, apollo, athena)
            status: New status (idle, working, done, error)
            task: Description of current task (optional)
        """
        self._check_initialized()
        if agent_name in self._state["agent_status"]:
            self._state["agent_status"][agent_name] = {
                "status": status,
                "last_task": task,
                "last_active": datetime.now().isoformat(),
            }

    def add_activity(self, activity: Dict):
        """
        Add an activity entry to the log (prepended — most recent first).
        
        Args:
            activity: Dict with keys: agent, action, details, timestamp
        """
        self._check_initialized()
        # Add timestamp if not present
        if "timestamp" not in activity:
            activity["timestamp"] = datetime.now().isoformat()
        # Prepend (most recent first)
        self._state["activity_log"].insert(0, activity)
        # Keep only the last 200 entries in memory
        if len(self._state["activity_log"]) > 200:
            self._state["activity_log"] = self._state["activity_log"][:200]

    def add_approval(self, approval: Dict):
        """Add a pending approval item."""
        self._check_initialized()
        self._state["pending_approvals"].append(approval)

    def remove_approval(self, approval_id: str):
        """Remove an approval item (after it's been resolved)."""
        self._check_initialized()
        self._state["pending_approvals"] = [
            a for a in self._state["pending_approvals"] if a.get("id") != approval_id
        ]

    def add_agent_message(self, message: Dict):
        """Add an inter-agent message to the log."""
        self._check_initialized()
        if "timestamp" not in message:
            message["timestamp"] = datetime.now().isoformat()
        self._state["agent_messages"].insert(0, message)
        # Keep only the last 100 messages in memory
        if len(self._state["agent_messages"]) > 100:
            self._state["agent_messages"] = self._state["agent_messages"][:100]

    # ========================================================================
    # INTERNAL HELPERS
    # ========================================================================

    def _check_initialized(self):
        """Ensure the state manager has been initialized."""
        if not self._initialized:
            raise RuntimeError(
                "StateManager not initialized! Call state_manager.initialize() first."
            )


# ============================================================================
# GLOBAL SINGLETON INSTANCE
# ============================================================================
# Import this anywhere: from app.state.state_manager import state_manager
# ============================================================================
state_manager = StateManager()
