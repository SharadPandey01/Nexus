# ============================================================================
# NEXUS BACKEND — Event Pydantic Models
# ============================================================================
# These models define the core structure of an Event and its components,
# providing strict validation and type hinting across the backend.
# 
# Pydantic ensures that data coming from the frontend or database
# strictly adheres to these shapes.
# ============================================================================

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class Venue(BaseModel):
    """
    Represents a specific room or location where sessions can be held.
    Used by the Scheduler Agent to assign rooms based on capacity and needs.
    """
    name: str = Field(..., description="Name of the room, e.g., 'Main Hall' or 'Room 101'")
    capacity: int = Field(..., description="Maximum number of people the room can hold")
    location: Optional[str] = Field(None, description="Physical location details (e.g., 'Floor 3')")
    has_projector: bool = Field(True, description="Whether the room has presentation equipment")
    has_wifi: bool = Field(True, description="Whether the room has internet access")


class Session(BaseModel):
    """
    Represents an individual session within the event (talk, workshop, break).
    This is the core unit that the Scheduler Agent manipulates.
    """
    title: str = Field(..., description="Title of the session")
    description: Optional[str] = Field(None, description="Detailed description of what the session covers")
    session_type: str = Field("talk", description="Type of session (e.g., 'talk', 'workshop', 'break', 'keynote')")
    speaker: Optional[str] = Field(None, description="Name of the person leading the session")
    duration_minutes: int = Field(60, description="How long the session lasts in minutes")
    preferred_venue: Optional[str] = Field(None, description="If the session requires a specific room")
    day: Optional[int] = Field(None, description="Specific day of the event this should occur (1-indexed)")
    capacity: Optional[int] = Field(None, description="Maximum number of attendees for this specific session")


class FixedSlot(BaseModel):
    """
    Represents an event that MUST happen at a specific time and place.
    The Scheduler Agent will build the rest of the schedule around these.
    Examples: Opening Ceremony, Lunch, Closing Remarks.
    """
    title: str = Field(..., description="Name of the fixed slot")
    venue: str = Field(..., description="Where it must take place")
    day: int = Field(..., description="Which day it occurs on")
    start_time: str = Field(..., description="Exact start time, formatted as HH:MM")
    end_time: str = Field(..., description="Exact end time, formatted as HH:MM")


class EventCreate(BaseModel):
    """
    Schema for creating a new event via the REST API.
    Contains only the fields the organizer needs to provide initially.
    """
    name: str = Field(..., description="Name of the event (e.g., 'TechFest 2026')")
    description: Optional[str] = Field(None, description="General description of the event")
    start_date: Optional[str] = Field(None, description="Start date (ISO 8601 string)")
    end_date: Optional[str] = Field(None, description="End date (ISO 8601 string)")
    location: Optional[str] = Field(None, description="Overall event location or venue")
    organizer_name: Optional[str] = Field(None, description="Name of the individual or org running the event")
    venues: Optional[List[Venue]] = Field(default_factory=list, description="Available rooms at the location")
    days: int = Field(1, description="Total number of days the event lasts")


class EventUpdate(BaseModel):
    """
    Schema for updating an existing event via the REST API.
    All fields are optional; only provided fields will be updated.
    """
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    organizer_name: Optional[str] = None
    status: Optional[str] = None


class Event(BaseModel):
    """
    The full Event model as it exists in the backend and database.
    Includes system-generated fields like IDs, timestamps, and status.
    """
    id: str = Field(..., description="Unique UUID for the event")
    name: str = Field(..., description="Name of the event")
    description: Optional[str] = Field(None, description="General description of the event")
    start_date: Optional[str] = Field(None, description="Start date (ISO 8601 string)")
    end_date: Optional[str] = Field(None, description="End date (ISO 8601 string)")
    location: Optional[str] = Field(None, description="Overall event location or venue")
    organizer_name: Optional[str] = Field(None, description="Name of the individual or org running the event")
    status: str = Field("draft", description="Current state of the event (draft, active, completed)")
    venues: List[Venue] = Field(default_factory=list, description="Available rooms at the location")
    days: int = Field(1, description="Total number of days the event lasts")
    config: dict = Field(default_factory=dict, description="Flexible JSON field for extra event settings")
    created_at: str = Field(..., description="Timestamp when the event was created")
    updated_at: str = Field(..., description="Timestamp when the event was last updated")
