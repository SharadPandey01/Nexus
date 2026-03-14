# ============================================================================
# NEXUS BACKEND — File Upload API Routes
# ============================================================================
# Handles CSV/Excel file uploads for participant data.
#
# When a file is uploaded:
# 1. Validate file type (CSV or Excel only)
# 2. Parse the file using pandas
# 3. Validate emails, detect duplicates
# 4. Store clean participant data in the database
# 5. Update in-memory state
# 6. Emit PARTICIPANT_DATA_UPLOADED event (triggers agents)
#
# Endpoint:
#   POST /api/upload/participants → Upload a CSV/Excel of participants
# ============================================================================

import uuid
import os
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.state.state_manager import state_manager

# Create the router — mounted in main.py under /api prefix
router = APIRouter()

# Directory to temporarily store uploaded files
UPLOAD_DIR = "data/uploads"


# ============================================================================
# POST /api/upload/participants — Upload participant CSV/Excel
# ============================================================================

@router.post("/upload/participants")
async def upload_participants(file: UploadFile = File(...)):
    """
    Upload a CSV or Excel file containing participant data.
    
    The file is parsed, validated, and stored in the database.
    Agents (Hermes for mailing, Athena for analytics) are notified
    via the event system.
    
    Expected CSV columns (flexible — agent handles mapping):
    - name / full_name / Name
    - email / Email / email_address
    - role (optional) — attendee, speaker, volunteer
    - track (optional) — which track they follow
    - organization (optional) — company/school
    - phone (optional)
    
    Returns:
        Summary of parsed data: total, valid, invalid emails, etc.
    """
    # ---- Step 1: Validate file type ----
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Get the file extension
    file_ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    
    # Only accept CSV and Excel files
    allowed_extensions = {"csv", "xlsx", "xls"}
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '.{file_ext}'. Allowed: {', '.join(allowed_extensions)}"
        )

    # ---- Step 2: Save the uploaded file temporarily ----
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Generate a unique filename to avoid collisions
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)

    # Write the file to disk
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    # ---- Step 3: Parse the file ----
    try:
        from app.services.csv_parser import parse_participant_file
        parsed = await parse_participant_file(file_path)
    except Exception as e:
        # Clean up the file if parsing fails
        os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse file: {str(e)}"
        )

    # ---- Step 4: Store participants in database ----
    from app.database import get_db
    db = await get_db()
    
    # Get the current event ID (or use a default)
    event = state_manager.get_event()
    event_id = event["id"] if event else "default"
    now = datetime.now().isoformat()

    # Insert each valid participant
    for p in parsed["participants"]:
        participant_id = str(uuid.uuid4())
        await db.execute(
            """INSERT INTO participants (id, event_id, name, email, role, track,
               organization, phone, is_valid_email, metadata_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (participant_id, event_id, p.get("name", ""), p.get("email", ""),
             p.get("role", "attendee"), p.get("track", ""),
             p.get("organization", ""), p.get("phone", ""),
             1 if p.get("is_valid_email", True) else 0,
             "{}", now)
        )
    await db.commit()

    # ---- Step 5: Update in-memory state ----
    state_manager.add_participants(parsed["participants"])

    # ---- Step 6: Log the activity ----
    state_manager.add_activity({
        "agent": "system",
        "action": "participants_uploaded",
        "details": (
            f"Uploaded {parsed['total']} participants from {file.filename}. "
            f"Valid: {parsed['valid']}, Invalid emails: {parsed['invalid']}"
        ),
    })

    # ---- Step 7: Broadcast via WebSocket ----
    from app.api.websocket import manager
    await manager.send_state_update("participants", "uploaded", {
        "total": parsed["total"],
        "valid": parsed["valid"],
        "invalid": parsed["invalid"],
        "filename": file.filename,
    })

    # ---- Step 8: Trigger Event Dispatcher (Casscades to Agents) ----
    from app.state.event_dispatcher import event_dispatcher, EventType
    import asyncio
    # Fire and forget the orchestrator agent loop so the API returns instantly
    asyncio.create_task(event_dispatcher.dispatch(EventType.PARTICIPANT_DATA_UPLOADED))

    # Clean up the temp file
    try:
        os.remove(file_path)
    except Exception:
        pass  # Non-critical — file will be cleaned up eventually

    return {
        "status": "success",
        "summary": {
            "filename": file.filename,
            "total_rows": parsed["total"],
            "valid_participants": parsed["valid"],
            "invalid_emails": parsed["invalid"],
            "invalid_details": parsed.get("invalid_details", []),
        },
        "participants": parsed["participants"],  # Return all for Hermes UI
    }


# ============================================================================
# GET /api/participants — Get all participants
# ============================================================================

@router.get("/participants")
async def get_participants(event_id: Optional[str] = None):
    """
    Get the list of all uploaded participants for an event.
    """
    # Try in-memory state first
    participants = state_manager.get_participants()
    if participants:
        return {
            "status": "success",
            "participants": participants,
            "total": len(participants),
        }

    # Fall back to database
    try:
        from app.database import get_db
        db = await get_db()
        
        query = "SELECT * FROM participants"
        params = []
        
        if event_id:
            query += " WHERE event_id = ?"
            params.append(event_id)
            
        query += " ORDER BY created_at DESC"
            
        cursor = await db.execute(query, tuple(params))
        rows = await cursor.fetchall()
        participants_list = [dict(row) for row in rows]

        return {
            "status": "success",
            "participants": participants_list,
            "total": len(participants_list),
        }
    except Exception as e:
        return {
            "status": "error",
            "participants": [],
            "total": 0,
            "error": str(e)
        }
