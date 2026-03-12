# ============================================================================
# NEXUS BACKEND — Mail Pydantic Models
# ============================================================================
# These models define the inputs and outputs for Hermes (Mail Agent).
# They handle email drafting, personalization loops, and approvals.
# ============================================================================

from pydantic import BaseModel, Field
from typing import Optional, List, Literal


class EmailPreview(BaseModel):
    """
    Represents a sample email showing how placeholders ({{name}}) 
    are replaced with actual participant data.
    These are shown in the Approval UI.
    """
    to: str = Field(..., description="Recipient email address")
    subject: str = Field(..., description="Final personalized subject line")
    body: str = Field(..., description="Final personalized message body")


class MailRequest(BaseModel):
    """
    The structured input payload sent into the LangGraph orchestrator
    when targeting the Mail Agent (Hermes).
    """
    action: Literal["parse_data", "personalize", "segment", "send"] = Field(..., description="The specific operation requested")
    data_file: Optional[str] = Field(None, description="Path or reference to uploaded CSV data")
    base_template: Optional[str] = Field(None, description="The markdown/text template containing {{placeholders}}")
    segment_criteria: Optional[str] = Field(None, description="Natural language rules for who to email")
    recipients: Optional[List[dict]] = Field(None, description="Explicit list of recipients (if not using criteria)")


class MailResult(BaseModel):
    """
    The structured output payload returned by Hermes after drafting
    emails or segmenting participants.
    """
    action_completed: str = Field(..., description="Confirmation of what the agent finished")
    participants_processed: int = Field(0, description="Number of participants analyzed")
    invalid_emails: List[dict] = Field(default_factory=list, description="Emails that failed regex parsing")
    segments_created: List[dict] = Field(default_factory=list, description="If segmenting, the resulting groups")
    preview_emails: List[EmailPreview] = Field(default_factory=list, description="A few samples of the personalized output")
    ready_to_send: bool = Field(False, description="Whether the batch is queued and waiting for human approval")
    requires_approval: bool = Field(True, description="Almost all mail actions require human oversight before sending")
    reasoning: str = Field("", description="The AI's explanation of its drafting choices")
