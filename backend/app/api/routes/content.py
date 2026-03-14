# ============================================================================
# NEXUS BACKEND — Content API Routes
# ============================================================================
# Endpoints for the Content Studio powered by Apollo agent.
#
# Endpoints:
#   GET  /api/content       → Get the content queue
#   GET  /api/content/queue → Alias for GET /api/content
#   POST /api/content/generate → Generate new content via Apollo
#   POST /api/content/queue/{id}/approve → Approve a content piece
# ============================================================================

from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

from app.state.state_manager import state_manager

router = APIRouter()


# ============================================================================
# Pydantic models
# ============================================================================

class GenerateRequest(BaseModel):
    brief: str
    platforms: list[str] = ["linkedin", "twitter", "instagram"]
    tone: str = "auto"


# ============================================================================
# GET /api/content — Get the content queue
# ============================================================================

@router.get("/content")
@router.get("/content/queue")
async def get_content(
    status: Optional[str] = None,
    content_type: Optional[str] = None,
    event_id: Optional[str] = None,
):
    """
    Get the current content queue.
    Returns all generated content pieces with their status.
    """
    # Try in-memory state first
    content_queue = state_manager.get_content_queue()

    if content_queue:
        filtered = content_queue
        if status:
            filtered = [c for c in filtered if c.get("status") == status]
        if content_type:
            filtered = [c for c in filtered if c.get("content_type") == content_type]

        return {
            "status": "success",
            "content": filtered,
            "total": len(filtered),
        }

    # Fall back to database
    from app.database import get_db
    db = await get_db()

    query = "SELECT * FROM content_queue WHERE 1=1"
    params = []

    if status:
        query += " AND status = ?"
        params.append(status)
    if content_type:
        query += " AND content_type = ?"
        params.append(content_type)
    if event_id:
        query += " AND event_id = ?"
        params.append(event_id)

    query += " ORDER BY created_at DESC"

    cursor = await db.execute(query, tuple(params))
    rows = await cursor.fetchall()
    content = [dict(row) for row in rows]

    return {
        "status": "success",
        "content": content,
        "total": len(content),
    }


# ============================================================================
# POST /api/content/generate — Generate new content via Apollo
# ============================================================================

@router.post("/content/generate")
async def generate_content(req: GenerateRequest):
    """
    Generate new content by calling the Apollo agent directly.
    Returns content_pieces, campaign_timeline, and engagement_insights.
    """
    from app.agents.apollo import apollo_agent

    # Build a state dict that Apollo expects
    event = state_manager.get_event() or {}
    schedule = state_manager.get_schedule()
    content_queue = state_manager.get_content_queue()

    state = {
        "user_input": f"{req.brief}\n\nPlatforms: {', '.join(req.platforms)}. Tone: {req.tone}.",
        "event": event,
        "schedule": schedule or [],
        "content_queue": content_queue or [],
        "participants": [],
        "pending_tasks": [],
    }

    result = await apollo_agent(state)
    output = result.get("content_output", {})

    return {
        "status": "success",
        "variants": output.get("content_pieces", []),
        "campaign_timeline": output.get("campaign_timeline", {}),
        "engagement_insights": output.get("engagement_insights", {}),
        "reasoning": output.get("reasoning", ""),
    }


# ============================================================================
# POST /api/content/queue/{id}/approve — Approve a content piece
# ============================================================================

@router.post("/content/queue/{content_id}/approve")
async def approve_content(content_id: str):
    """
    Approve a content piece, changing its status from 'draft' to 'approved'.
    """
    # Update in-memory state
    content_queue = state_manager.get_content_queue()
    found = False
    if content_queue:
        for item in content_queue:
            if item.get("id") == content_id:
                item["status"] = "approved"
                found = True
                break

    # Also update in database
    try:
        from app.database import get_db
        db = await get_db()
        await db.execute(
            "UPDATE content_queue SET status = 'approved' WHERE id = ?",
            (content_id,),
        )
        await db.commit()
        found = True
    except Exception as e:
        print(f"[Content] DB update for '{content_id}' failed: {e}")

    return {
        "status": "success" if found else "not_found",
        "content_id": content_id,
        "new_status": "approved",
    }
