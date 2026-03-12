# ============================================================================
# NEXUS BACKEND — Participant Pydantic Models
# ============================================================================
# These models define the structure of participant data, which is heavily
# used by Hermes (Mail Agent) and Athena (Analytics Agent).
# ============================================================================

from pydantic import BaseModel, Field
from typing import Optional, List


class Participant(BaseModel):
    """
    Represents a single registered individual for the event.
    Usually populated by parsing an uploaded CSV/Excel file.
    """
    name: str = Field(..., description="Full name of the participant")
    email: str = Field(..., description="Contact email address (used as primary identifier)")
    role: str = Field("attendee", description="User's role (attende, speaker, volunteer, organizer)")
    track: Optional[str] = Field(None, description="Specific track or sub-event they are attending")
    organization: Optional[str] = Field(None, description="Company, university, or affiliated group")
    phone: Optional[str] = Field(None, description="Contact phone number")
    is_valid_email: bool = Field(True, description="Flag indicating if the email passed regex validation")
    metadata: dict = Field(default_factory=dict, description="Flexible JSON field for custom CSV columns")


class InvalidEmail(BaseModel):
    """
    Represents a row in the CSV that failed validation due to a bad email.
    Returned to the frontend so the organizer can manually fix it.
    """
    email: str = Field(..., description="The malformed email address found")
    name: str = Field("", description="The name associated with the bad email (if any)")
    reason: str = Field("Invalid format", description="Why it was rejected (e.g., 'Missing domain')")


class Segment(BaseModel):
    """
    Represents a grouping of participants.
    Hermes (Mail Agent) creates segments to send targeted emails
    (e.g., 'All Speakers' or 'Attendees in the AI Track').
    """
    name: str = Field(..., description="Human-readable name of the segment (e.g., 'Speakers')")
    criteria: str = Field(..., description="The rule used to group them (e.g., 'role=speaker')")
    count: int = Field(..., description="Number of participants in this segment")
    participant_emails: List[str] = Field(default_factory=list, description="List of emails in this segment")


class ParticipantUploadResult(BaseModel):
    """
    The structured summary returned by the CSV Parser Service after
    processing an uploaded file.
    """
    total: int = Field(..., description="Total number of rows processed in the file")
    valid: int = Field(..., description="Number of rows with valid email addresses")
    invalid: int = Field(..., description="Number of rows with missing or invalid emails")
    duplicates: int = Field(0, description="Number of duplicate emails found and ignored")
    invalid_details: List[InvalidEmail] = Field(default_factory=list, description="Specifics on the invalid rows")
    participants: List[Participant] = Field(default_factory=list, description="The list of valid parsed participants")
    columns_found: List[str] = Field(default_factory=list, description="The original column headers found in the file")
