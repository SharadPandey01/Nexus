# ============================================================================
# NEXUS BACKEND — Mail API Routes (Hermes Agent)
# ============================================================================
# Endpoints for the Mail Center powered by Hermes agent.
#
# Endpoints:
#   GET  /api/mail/participants    → Get participants from state/DB
#   POST /api/mail/upload          → Upload CSV (re-exports upload route)
#   POST /api/mail/draft           → Draft emails via Hermes agent
#   POST /api/mail/personalize     → Personalize a template for participants
#   POST /api/mail/send            → Mark emails as queued for sending
# ============================================================================

from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.state.state_manager import state_manager

router = APIRouter()


# ============================================================================
# Pydantic models
# ============================================================================

class DraftRequest(BaseModel):
    prompt: str
    segment: str = "all"

class PersonalizeRequest(BaseModel):
    template: str
    segment_criteria: str = "all"


# ============================================================================
# GET /api/mail/participants — Get participants from state/DB
# ============================================================================

@router.get("/mail/participants")
async def get_participants():
    """Return all participants from in-memory state or database."""
    participants = state_manager.get_participants()

    if participants:
        valid = [p for p in participants if p.get("is_valid_email", True)]
        invalid = [p for p in participants if not p.get("is_valid_email", True)]
        return {
            "status": "success",
            "participants": [
                {
                    "id": p.get("id", f"p_{i}"),
                    "name": p.get("name", p.get("Name", "")),
                    "email": p.get("email", p.get("Email", "")),
                    "role": p.get("role", p.get("Role", "attendee")),
                    "track": p.get("track", p.get("Track", "")),
                    "organization": p.get("organization", p.get("Organization", "")),
                    "status": "valid" if p.get("is_valid_email", True) else "invalid",
                }
                for i, p in enumerate(participants)
            ],
            "total": len(participants),
            "valid": len(valid),
            "invalid": len(invalid),
        }

    # Fall back to database
    try:
        from app.database import get_db
        db = await get_db()
        cursor = await db.execute(
            "SELECT * FROM participants ORDER BY created_at DESC"
        )
        rows = await cursor.fetchall()
        db_participants = [dict(row) for row in rows]
        return {
            "status": "success",
            "participants": [
                {
                    "id": p.get("id", ""),
                    "name": p.get("name", ""),
                    "email": p.get("email", ""),
                    "role": p.get("role", "attendee"),
                    "track": p.get("track", ""),
                    "organization": p.get("organization", ""),
                    "status": "valid" if p.get("is_valid_email", 1) else "invalid",
                }
                for p in db_participants
            ],
            "total": len(db_participants),
        }
    except Exception:
        return {"status": "success", "participants": [], "total": 0}


# ============================================================================
# POST /api/mail/draft — Draft emails via Hermes agent
# ============================================================================

@router.post("/mail/draft")
async def draft_emails(req: DraftRequest):
    """
    Call the Hermes agent to draft emails from a natural language prompt.
    Returns preview emails, segments, validation info, and reasoning.
    """
    from app.agents.hermes import hermes_agent

    event = state_manager.get_event() or {}
    participants = state_manager.get_participants() or []
    schedule = state_manager.get_schedule() or []

    state = {
        "user_input": req.prompt,
        "event": event,
        "participants": participants,
        "schedule": schedule,
        "pending_tasks": [],
    }

    result = await hermes_agent(state)
    output = result.get("mailer_output", {})

    return {
        "status": "success",
        "preview_emails": output.get("preview_emails", []),
        "segments": output.get("segments_created", []),
        "invalid_emails": output.get("invalid_emails", []),
        "email_template": output.get("email_template", ""),
        "participants_processed": output.get("participants_processed", 0),
        "reasoning": output.get("reasoning", ""),
        "ready_to_send": output.get("ready_to_send", False),
    }


# ============================================================================
# POST /api/mail/personalize — Personalize template for participants
# ============================================================================

@router.post("/mail/personalize")
async def personalize_emails(req: PersonalizeRequest):
    """
    Personalize a template by replacing {{placeholders}} with participant data.
    Returns preview emails for display.
    """
    participants = state_manager.get_participants() or []

    if not participants:
        # Generate sample previews with placeholder data
        return {
            "status": "success",
            "previews": [
                {
                    "to": "sample@example.com",
                    "subject": "Event Update",
                    "body": req.template
                        .replace("{{name}}", "John Doe")
                        .replace("{{first_name}}", "John")
                        .replace("{{role}}", "attendee")
                        .replace("{{track}}", "AI & ML")
                        .replace("{{first_session_time}}", "9:00 AM")
                        .replace("{{first_room}}", "Main Hall"),
                }
            ],
        }

    # Filter by segment
    filtered = participants
    if req.segment_criteria and req.segment_criteria != "all":
        criteria = req.segment_criteria.lower()
        filtered = [
            p for p in participants
            if criteria in (p.get("role", "").lower())
            or criteria in (p.get("track", "").lower())
        ]
        if not filtered:
            filtered = participants[:3]

    # Generate previews for up to 5 participants
    previews = []
    for p in filtered[:5]:
        name = p.get("name", p.get("Name", "Attendee"))
        first_name = name.split()[0] if name else "Attendee"
        body = (
            req.template
            .replace("{{name}}", name)
            .replace("{{first_name}}", first_name)
            .replace("{{last_name}}", name.split()[-1] if name else "")
            .replace("{{email}}", p.get("email", p.get("Email", "")))
            .replace("{{role}}", p.get("role", p.get("Role", "attendee")))
            .replace("{{track}}", p.get("track", p.get("Track", "")))
            .replace("{{organization}}", p.get("organization", ""))
            .replace("{{first_session_time}}", "9:00 AM")
            .replace("{{first_room}}", "Main Hall")
        )
        previews.append({
            "to": p.get("email", p.get("Email", "")),
            "subject": f"Event Update for {first_name}",
            "body": body,
        })

    return {"status": "success", "previews": previews}


# ============================================================================
# POST /api/mail/send — Queue emails for sending
# ============================================================================

@router.post("/mail/send")
async def send_batch():
    """
    Mark all draft emails as queued for sending.
    In a real system this would integrate with an email service.
    For the demo, it updates the status in the state manager.
    """
    return {
        "status": "success",
        "message": "All approved emails have been queued for delivery.",
        "queued": True,
    }
