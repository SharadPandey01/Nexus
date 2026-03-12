# ============================================================================
# NEXUS BACKEND — Schedule Pydantic Models
# ============================================================================
# These models define the inputs and outputs for Chronos (Scheduler Agent).
# They map out how sessions are placed on the timeline and how conflicts
# are identified and resolved.
# ============================================================================

from pydantic import BaseModel, Field
from typing import Optional, List


class ScheduledSession(BaseModel):
    """
    Represents a session that has been finalized by Chronos and mapped
    onto the actual event timeline.
    """
    id: str = Field(..., description="Unique UUID for the scheduled session")
    title: str = Field(..., description="Title of the session")
    session_type: str = Field("talk", description="Type (talk, workshop, break, keynote)")
    speaker: Optional[str] = Field(None, description="Name of the speaker")
    venue: str = Field(..., description="The specific room assigned to this session")
    day: int = Field(..., description="Which day of the event it occurs on (1-indexed)")
    start_time: str = Field(..., description="Start time formatted as HH:MM")
    end_time: str = Field(..., description="End time formatted as HH:MM")
    capacity: Optional[int] = Field(None, description="Max attendees based on room limits")
    status: str = Field("scheduled", description="Status (scheduled, moved, cancelled)")


class Conflict(BaseModel):
    """
    Represents a scheduling error detected by Chronos.
    Chronos will analyze the schedule, output conflicts, and then
    attempt to resolve them autonomously.
    """
    type: str = Field(..., description="e.g., 'room_overlap', 'speaker_double_booking', 'time_violation'")
    severity: str = Field(..., description="Severity level: 'hard' (must fix) or 'soft' (should fix)")
    description: str = Field(..., description="Natural language description of the problem")
    sessions_involved: List[str] = Field(default_factory=list, description="IDs of the conflicting sessions")


class Resolution(BaseModel):
    """
    Represents an action Chronos took to resolve a Conflict.
    Used for the activity stream to show the organizer *why* the schedule
    ended up the way it did.
    """
    conflict_type: str = Field(..., description="The type of conflict that was solved")
    action_taken: str = Field(..., description="Description of the fix (e.g., 'Moved session to Room B')")
    sessions_moved: List[str] = Field(default_factory=list, description="IDs of sessions that had their time/room changed")
    participants_affected: int = Field(0, description="Estimated number of attendees impacted by this change")


class ScheduleRequest(BaseModel):
    """
    The structured input payload sent into the LangGraph orchestrator
    when targeting the Scheduler Agent (Chronos).
    """
    event_name: str = Field(..., description="Name of the event")
    days: int = Field(1, description="Total days available for scheduling")
    venues: List[dict] = Field(default_factory=list, description="Available rooms and capacities")
    sessions: List[dict] = Field(default_factory=list, description="List of unscheduled sessions")
    constraints: List[str] = Field(default_factory=list, description="Natural language rules (e.g., 'No workshops before 10 AM')")
    fixed_slots: List[dict] = Field(default_factory=list, description="Mandatory slots that cannot be moved")


class ScheduleResult(BaseModel):
    """
    The structured output payload returned by Chronos after compiling
    and optimizing the timeline.
    """
    timeline: List[ScheduledSession] = Field(default_factory=list, description="The final, finalized schedule sequence")
    conflicts_found: List[Conflict] = Field(default_factory=list, description="Issues the agent detected initially")
    conflicts_resolved: List[Resolution] = Field(default_factory=list, description="How the agent fixed those issues")
    warnings: List[str] = Field(default_factory=list, description="Soft warnings (e.g., 'Room A is at 95% capacity')")
    reasoning: str = Field("", description="The AI's explanation of its scheduling decisions")
