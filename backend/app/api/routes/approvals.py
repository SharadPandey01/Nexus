# ============================================================================
# NEXUS BACKEND — Approvals API Routes
# ============================================================================
# Handles the human-in-the-loop approval workflow.
#
# Agents can request approval before taking consequential actions
# (sending emails, publishing content, finalizing schedules).
# The organizer reviews and approves/rejects/edits via the frontend.
#
# Endpoints:
#   GET  /api/approvals         → List all pending approvals
#   POST /api/approval/{id}     → Approve, reject, or edit a pending item
# ============================================================================

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException

from app.state.state_manager import state_manager

# Create the router
router = APIRouter()


# ============================================================================
# GET /api/approvals — List pending approvals
# ============================================================================

@router.get("/approvals")
async def list_approvals(status: Optional[str] = "pending"):
    """
    List approval items, optionally filtered by status.
    
    Args:
        status: Filter by status (pending, approved, rejected). Default: pending
    
    Returns:
        List of approval items
    """
    # Check in-memory state for pending items
    if status == "pending":
        pending = state_manager.get_pending_approvals()
        return {
            "status": "success",
            "approvals": pending,
            "total": len(pending),
        }

    # For non-pending, query the database
    from app.database import get_db
    db = await get_db()

    query = "SELECT * FROM approvals"
    params = ()
    if status:
        query += " WHERE status = ?"
        params = (status,)
    query += " ORDER BY created_at DESC"

    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    approvals = [dict(row) for row in rows]

    return {
        "status": "success",
        "approvals": approvals,
        "total": len(approvals),
    }


# ============================================================================
# POST /api/approval/{approval_id} — Resolve an approval
# ============================================================================

@router.post("/approval/{approval_id}")
async def resolve_approval(
    approval_id: str,
    decision: str,  # "approve", "reject", or "edit"
    notes: Optional[str] = None,
    edited_data: Optional[str] = None,
):
    """
    Resolve a pending approval item.
    
    The organizer can:
    - APPROVE: Execute the action as proposed by the agent
    - REJECT: Cancel the action
    - EDIT: Modify the action before executing (e.g., edit email text)
    
    After approval, the system re-enters the LangGraph graph to execute
    the approved action.
    
    Args:
        approval_id: ID of the approval item
        decision: "approve", "reject", or "edit"
        notes: Optional organizer notes
        edited_data: Modified data if decision is "edit" (JSON string)
    
    Returns:
        Updated approval status and any resulting actions
    """
    # Validate the decision
    valid_decisions = {"approve", "reject", "edit"}
    if decision not in valid_decisions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid decision '{decision}'. Must be one of: {', '.join(valid_decisions)}"
        )

    # Resolve the approval record
    # First, get the approval so we know which agent this is for
    from app.database import get_db
    db = await get_db()
    cursor = await db.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,))
    row = await cursor.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail=f"Approval {approval_id} not found")
        
    approval_record = dict(row)

    now = datetime.now().isoformat()

    # Update in the database
    await db.execute(
        """UPDATE approvals SET status=?, organizer_notes=?, resolved_at=?
           WHERE id=?""",
        (decision + "d" if decision != "edit" else "edited", notes, now, approval_id)
        # "approve" → "approved", "reject" → "rejected", "edit" → "edited"
    )
    await db.commit()

    # Remove from in-memory pending list
    state_manager.remove_approval(approval_id)

    # Log the decision
    state_manager.add_activity({
        "agent": "organizer",
        "action": f"approval_{decision}",
        "details": f"Organizer {decision}d approval {approval_id}" + (f": {notes}" if notes else ""),
    })

    # Broadcast the decision via WebSocket
    from app.api.websocket import manager
    await manager.send_state_update("approval", decision, {
        "approval_id": approval_id,
        "decision": decision,
    })

    # =========================================================================
    # DETERMINISTIC EXECUTION
    # Instead of sending a vague prompt back to the LLM orchestrator,
    # we explicitly update the backend database state based on what was approved.
    # =========================================================================
    if decision in ["approve", "reject"]:
        import json
        from app.repository import update_content_status
        
        agent_name = approval_record.get("agent", "")
        preview_data = json.loads(approval_record.get("preview_json", "{}"))
        content_ids = preview_data.get("content_ids", [])
        
        if content_ids:
            if agent_name == "hermes":
                # For emails, 'approve' means they are sent. 
                # (In this hackathon state, we just mark them 'sent')
                new_status = "sent" if decision == "approve" else "rejected"
                await update_content_status(content_ids, new_status)
                
            elif agent_name == "apollo":
                # For social posts, 'approve' means they are queued/published.
                new_status = "published" if decision == "approve" else "rejected"
                await update_content_status(content_ids, new_status)
                
        # If approved, we could theoretically still trigger an event_dispatcher cascade
        # here if we wanted OTHER agents to react to the fact that content was published.
        # But for the content itself, the database status is already updated!

    return {
        "status": "success",
        "approval_id": approval_id,
        "decision": decision,
        "message": f"Approval {decision}d successfully",
    }
