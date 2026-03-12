# ============================================================================
# NEXUS BACKEND — Agent Communication Pydantic Models
# ============================================================================
# These models define how agents talk to each other, how they request human
# intervention, and how the WebSocket streams activity to the frontend.
# ============================================================================

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AgentMessage(BaseModel):
    """
    Represents an internal message between two agents.
    For example, when Chronos tells Hermes "I moved a session, please
    email these 50 attendees."
    These messages are logged and displayed in the Activity Panel.
    """
    from_agent: str = Field(..., description="The agent sending the message (e.g., 'chronos')")
    to_agent: str = Field(..., description="The agent receiving the message (e.g., 'hermes')")
    message_type: str = Field("notification", description="Type (request, notification, data_share)")
    priority: str = Field("normal", description="Urgency (critical, normal, low)")
    payload: dict = Field(default_factory=dict, description="The JSON data being passed between agents")
    requires_response: bool = Field(False, description="Whether the sending agent is waiting for a reply")
    timestamp: str = Field("", description="When the message was sent")
    trace_id: str = Field("", description="Unique run ID to group related actions together")


class ApprovalItem(BaseModel):
    """
    The Human-in-the-Loop object.
    When an agent wants to do something consequential (send 1000 emails,
    publish to Twitter, finalize a schedule), it creates an ApprovalItem.
    The graph pauses until the Organizer approves, edits, or rejects it.
    """
    id: str = Field(..., description="Unique UUID for this approval request")
    agent: str = Field(..., description="Which agent is asking for permission")
    action: str = Field(..., description="What the agent wants to do (e.g., 'send_bulk_email')")
    description: str = Field(..., description="Human-readable summary of the action")
    impact: str = Field("", description="What will happen (e.g., 'Will email 450 participants')")
    preview: dict = Field(default_factory=dict, description="Preview data (e.g., the email content)")
    options: List[str] = Field(["approve", "edit", "reject"], description="Allowed actions for the user")
    status: str = Field("pending", description="Current state (pending, approved, rejected, edited)")
    created_at: str = Field("", description="When the approval was requested")


class WSMessage(BaseModel):
    """
    The standard wrapper for ALL messages sent over the WebSocket.
    Ensures the frontend always knows how to parse incoming events.
    """
    type: str = Field(..., description="The message type (agent_status, agent_complete, approval_request, etc.)")
    data: dict = Field(default_factory=dict, description="The payload corresponding to the type")
    timestamp: str = Field("", description="When the message was broadcast")


class AgentStatus(BaseModel):
    """
    Represents what an agent is doing at this exact moment.
    Used to drive the bouncing "working" indicators on the frontend UI.
    """
    agent: str = Field(..., description="The agent's name")
    status: str = Field("idle", description="What it's doing (idle, working, done, error)")
    last_task: Optional[str] = Field(None, description="A brief string explaining what it is working on")
    last_active: Optional[str] = Field(None, description="ISO timestamp of its last action")
