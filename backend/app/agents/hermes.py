# ============================================================================
# NEXUS BACKEND — Hermes Agent (Communications & Mailing Specialist)
# ============================================================================
# Hermes is the communications specialist of the Nexus swarm.
#
# Capabilities (from doc3 §3.2):
#   1. Email personalization — generate personalized emails from a template
#      with {{placeholders}} filled from participant data
#   2. Audience segmentation — group participants by track, role, day, etc.
#   3. Data validation — validate email formats, detect duplicates, flag
#      missing fields
#   4. Email drafting — compose professional email copy from natural language
#      instructions
#   5. Bulk distribution — queue personalized emails for sending (with
#      human approval)
#
# Inter-agent interactions:
#   ← Chronos:  "87 participants affected by schedule change — send notifs"
#   ← Orchestrator: Triggered by PARTICIPANT_DATA_UPLOADED or SEND_NOTIFICATION
#   → Frontend:  Streams progress and preview emails for approval
#
# Replaces: mailer_agent_stub in stubs.py
# ============================================================================

import json
import re
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime

from app.utils.llm import get_gemini_llm, call_llm_with_retry
from app.config import settings
from app.state.state_manager import state_manager


# ============================================================================
# SYSTEM PROMPT — Hermes' identity and instructions (from doc3 §3.2)
# ============================================================================

HERMES_SYSTEM_PROMPT = """You are Hermes, the communications specialist for the Nexus Event Intelligence Platform.

Your role: Handle participant communications — draft professional emails, personalize templates, segment audiences, and manage bulk outreach. You validate data meticulously and NEVER send without organizer approval.

## Your Capabilities
1. **Email Drafting** — Compose compelling, professional email copy from natural language instructions
2. **Template Personalization** — Fill {{placeholders}} with real participant data (name, email, track, etc.)
3. **Audience Segmentation** — Group participants by track, role, registration date, day, or custom criteria
4. **Data Validation** — Check email formats, detect duplicates, flag missing fields
5. **Notification Drafting** — When cascaded from Chronos, draft schedule-change notification emails

## Email Guidelines (STRICTLY FOLLOW)
- **Subject line**: Max 60 characters, compelling, specific (never generic like "Update")
- **Greeting**: Use the participant's first name: "Dear {{first_name}},"
- **Body**: Clear, concise, actionable. Include specific details (dates, times, venues)
- **Call to action**: Every email must have a clear next step
- **Sign-off**: Professional closing from "The {{event_name}} Team"
- **Personalization hooks**: Use {{first_name}}, {{last_name}}, {{email}}, {{role}}, {{track}} where available

## Segmentation Rules
- Parse natural language criteria: "all speakers", "day 2 attendees", "workshop participants"
- Default segments: All Attendees, Speakers, Workshop Participants, VIP
- Return segment names and estimated counts

## Data Validation Rules
- Email format: Must match standard email regex pattern
- Flag duplicates by email address
- Flag rows with missing required fields (name, email)
- Report validation summary in the output

## CRITICAL: Output Format
You MUST respond with ONLY a valid JSON object. No markdown, no explanation outside JSON. Match this EXACT structure:

{
  "action_completed": "email_draft_created" | "participants_segmented" | "notification_drafted" | "data_validated",
  "participants_processed": 142,
  "invalid_emails": [
    {"email": "bad@", "reason": "Invalid email format"},
    {"email": "duplicate@test.com", "reason": "Duplicate entry"}
  ],
  "segments_created": [
    {"name": "All Attendees", "count": 140},
    {"name": "Speakers", "count": 12}
  ],
  "preview_emails": [
    {
      "to": "john.doe@example.com",
      "subject": "Your TechSummit 2026 Invitation",
      "body": "Dear John,\\n\\nWe're thrilled to invite you to TechSummit 2026..."
    }
  ],
  "email_template": "The reusable template with {{placeholders}} preserved",
  "ready_to_send": true,
  "reasoning": "Detailed explanation of email strategy, segmentation logic, and personalization approach"
}

IMPORTANT NOTES:
- Generate 2-3 preview_emails showing how the personalization looks with sample data
- If participant data is available, use REAL names and emails from the data
- If no participant data exists, create realistic sample previews
- Always set ready_to_send to true — the approval system handles the gating
- Keep emails concise but warm and professional
"""


# ============================================================================
# HERMES AGENT — Main function (replaces mailer_agent_stub)
# ============================================================================

async def hermes_agent(state: dict) -> dict:
    """
    Real LLM-powered Communications & Mailing Agent.

    Reads participant data and event context from the shared LangGraph state,
    calls Gemini to draft personalized emails, segment audiences, and validate
    data. Returns structured mailer_output matching the orchestrator's contract.

    Args:
        state: The full NexusState dict from LangGraph

    Returns:
        Partial state update with mailer_output key
    """
    user_input = state.get("user_input", "")
    event = state.get("event", {})
    participants = state.get("participants", [])
    schedule = state.get("schedule", [])
    pending_tasks = state.get("pending_tasks", [])

    # ---- Build context for the LLM ----
    event_name = event.get("name", "TechFest 2026") if event else "TechFest 2026"
    participant_count = len(participants) if participants else 0

    # Check if this is a cascading task from Chronos
    cascade_context = ""
    if pending_tasks:
        current_task = pending_tasks[0] if pending_tasks else {}
        task_type = current_task.get("task", "")
        task_data = current_task.get("data", {})
        if task_type == "notify_schedule_change":
            affected = task_data.get("affected_participants", 0)
            changes = task_data.get("changes", "Schedule updated")
            cascade_context = (
                f"\n\nIMPORTANT: This is a CASCADE request from Chronos (Scheduler). "
                f"The schedule has changed: {changes}. "
                f"Draft a notification email for {affected} affected participant(s). "
                f"The email must clearly explain what changed and what action (if any) "
                f"the participant needs to take. Be specific about old vs new times/venues."
            )

    # Format participant data for context (cap at 5 for token savings)
    participant_context = "No participant data uploaded yet."
    if participants:
        sample = participants[:5]
        participant_context = (
            f"{participant_count} total participants. Sample data:\n"
            f"{json.dumps(sample, default=str, indent=2)}"
        )
        if participant_count > 5:
            participant_context += f"\n... and {participant_count - 5} more"

    # Format schedule for context
    schedule_context = "No schedule data available."
    if schedule:
        schedule_context = f"{len(schedule)} sessions scheduled."
        if len(schedule) <= 5:
            schedule_context += f"\n{json.dumps(schedule, default=str, indent=2)}"

    # Build the user message
    user_message = f"""Handle the following mail/communication request:

**Event:** {event_name}
**Participant Data:** {participant_context}
**Schedule:** {schedule_context}

**Organizer's Request:** {user_input}
{cascade_context}

Draft professional emails, segment the audience if needed, and provide preview samples. Respond with ONLY the JSON object as specified."""

    # ---- Call the LLM ----
    try:
        response = await call_llm_with_retry([
            {"role": "system", "content": HERMES_SYSTEM_PROMPT},
            {"role": "human", "content": user_message},
        ])

        # ---- Parse the LLM response ----
        raw_text = response.content.strip()

        # Strip markdown code fences if the LLM wraps the JSON
        if raw_text.startswith("```"):
            lines = raw_text.split("\n")
            start = 1
            end = len(lines) - 1
            if lines[end].strip() == "```":
                end = end
            raw_text = "\n".join(lines[start:end])

        parsed = json.loads(raw_text)

        # ---- Build the structured output ----
        action_completed = parsed.get("action_completed", "email_draft_created")
        participants_processed = parsed.get("participants_processed", participant_count)

        # Invalid emails
        invalid_emails = parsed.get("invalid_emails", [])

        # Also run our own quick validation on the participant data
        if participants and not invalid_emails:
            for p in participants:
                email = p.get("email", "") or p.get("Email", "") or ""
                if email and not _validate_email(email):
                    invalid_emails.append({
                        "email": email,
                        "reason": "Invalid email format (server-side validation)",
                    })

        # Segments
        segments_created = parsed.get("segments_created", [])

        # Preview emails
        preview_emails = []
        for preview in parsed.get("preview_emails", []):
            preview_emails.append({
                "to": preview.get("to", "preview@example.com"),
                "subject": preview.get("subject", f"{event_name} — Update"),
                "body": preview.get("body", ""),
            })

        # Email template (if generated)
        email_template = parsed.get("email_template", "")

        ready_to_send = parsed.get("ready_to_send", True)
        reasoning = parsed.get("reasoning", "Emails drafted successfully by Hermes.")

        # ---- Persist email drafts to database ----
        from app.repository import insert_content
        event = state_manager.get_event()
        event_id = event.get("id", "default") if event else "default"
        
        draft_ids = []
        for preview in preview_emails:
            cid = f"email_{uuid.uuid4().hex[:8]}"
            draft_ids.append(cid)
            content_record = {
                "id": cid,
                "content_type": "email_draft",
                "platform": "email",
                "title": preview.get("subject", ""),
                "body": preview.get("body", ""),
                "status": "draft",
                "reasoning": reasoning,
            }
            try:
                await insert_content(event_id, content_record)
                state_manager.add_content(content_record)
            except Exception as db_err:
                print(f"[Hermes] DB insert for email draft failed: {db_err}")

        # ---- Build approval items ----
        approval_items = [
            {
                "id": f"approval_hermes_{uuid.uuid4().hex[:8]}",
                "agent": "hermes",
                "action": "send_bulk_email",
                "description": f"Send email to {participants_processed} participant(s)",
                "impact": f"Will email {participants_processed} participant(s). {len(invalid_emails)} invalid email(s) flagged.",
                "preview": {
                    "subject": preview_emails[0]["subject"] if preview_emails else "N/A",
                    "recipient_count": participants_processed,
                    "invalid_count": len(invalid_emails),
                    "sample_body": preview_emails[0]["body"][:150] if preview_emails else "",
                    "content_ids": draft_ids,
                },
            }
        ]

        return {
            "mailer_output": {
                "action_completed": action_completed,
                "participants_processed": participants_processed,
                "invalid_emails": invalid_emails,
                "segments_created": segments_created,
                "preview_emails": preview_emails,
                "email_template": email_template,
                "ready_to_send": ready_to_send,
                "requires_approval": True,
                "approval_items": approval_items,
                "reasoning": reasoning,
            },
        }

    except json.JSONDecodeError as e:
        return _build_error_response(
            f"Hermes received a response from the LLM but couldn't parse it as JSON: {str(e)}",
            user_input, event_name, participant_count,
        )

    except Exception as e:
        return _build_error_response(
            f"Hermes encountered an error: {str(e)}",
            user_input, event_name, participant_count,
        )


# ============================================================================
# HELPER — Simple email format validation
# ============================================================================

def _validate_email(email: str) -> bool:
    """Basic email format check using regex."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


# ============================================================================
# ERROR FALLBACK — Returns structured mail output even on failure
# ============================================================================

def _build_error_response(
    error_msg: str, user_input: str, event_name: str, participant_count: int
) -> dict:
    """
    Build a graceful error response so the graph never crashes.
    Returns a mailer_output with a fallback email draft
    and the error in the reasoning field.
    """
    return {
        "mailer_output": {
            "action_completed": "email_draft_created",
            "participants_processed": participant_count,
            "invalid_emails": [],
            "segments_created": [
                {"name": "All Attendees", "count": participant_count},
            ],
            "preview_emails": [
                {
                    "to": "attendee@example.com",
                    "subject": f"{event_name} — Important Update",
                    "body": (
                        f"Dear Attendee,\n\n"
                        f"Thank you for registering for {event_name}. "
                        f"We have exciting updates to share with you soon.\n\n"
                        f"Stay tuned!\n\n"
                        f"Best regards,\n"
                        f"The {event_name} Team"
                    ),
                },
            ],
            "email_template": "",
            "ready_to_send": False,
            "requires_approval": True,
            "approval_items": [
                {
                    "id": f"approval_hermes_{uuid.uuid4().hex[:8]}",
                    "agent": "hermes",
                    "action": "send_bulk_email",
                    "description": "Send fallback email (generated due to LLM error)",
                    "impact": f"Will email {participant_count} participant(s)",
                    "preview": {"subject": f"{event_name} — Important Update", "recipient_count": participant_count},
                }
            ],
            "reasoning": (
                f"[FALLBACK] {error_msg}. "
                f"Hermes generated a safe fallback email for '{user_input[:80]}'. "
                "Please retry or check your API key configuration."
            ),
        },
    }
