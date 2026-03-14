# ============================================================================
# NEXUS BACKEND — Chronos Agent (Master Scheduler & Conflict Resolver)
# ============================================================================
# Chronos is the scheduling intelligence of the Nexus swarm.
#
# Capabilities (from doc3 §3.2):
#   1. Build schedule from constraints — parses natural language + structured
#      inputs to generate a complete timeline
#   2. Conflict detection — room overlaps, speaker double-bookings, time
#      violations
#   3. Autonomous resolution — heuristic rules: prioritize keynotes >
#      workshops > breaks; minimize attendee disruption
#   4. Cascade notification — emits tasks to trigger Hermes (mail) and
#      Apollo (content) when schedule changes
#   5. What-if analysis — simulate schedule changes before committing
#
# Inter-agent interactions:
#   → Hermes:  "87 participants affected by schedule change — send notifs"
#   → Apollo:  "Keynote time changed — update queued social posts"
#   ← Orchestrator: Triggered by schedule requests or constraint changes
#
# Replaces: scheduler_agent_stub in stubs.py
# ============================================================================

import json
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings
from app.state.state_manager import state_manager


# ============================================================================
# SYSTEM PROMPT — Chronos' identity and instructions (from doc3 §3.2)
# ============================================================================

CHRONOS_SYSTEM_PROMPT = """You are Chronos, the scheduling intelligence for the Nexus Event Intelligence Platform.

Your role: Build optimal event schedules from rough constraints, detect conflicts, resolve them autonomously, and explain your reasoning clearly for the organizer.

## Your Capabilities
1. **Build Schedule** — Take natural language constraints + structured session data and generate a complete, optimized timeline
2. **Conflict Detection** — Identify room overlaps, speaker double-bookings, time violations, and capacity issues
3. **Autonomous Resolution** — Fix conflicts using priority rules: Keynotes > Workshops > Panels > Breaks. Minimize attendee disruption.
4. **Cascade Notification** — When schedule changes affect participants, flag tasks for the Mail and Content agents
5. **What-If Analysis** — When asked "what if we move X?", simulate the change and report impacts BEFORE committing

## Scheduling Rules (STRICTLY FOLLOW THESE)
- **No room double-booking**: Two sessions cannot occupy the same room at the same time
- **No speaker double-booking**: A speaker cannot present in two sessions simultaneously
- **Buffer time**: Always leave at least 15 minutes between sessions in the same room for transitions
- **Capacity respect**: Do not assign a session to a room smaller than expected attendance
- **Fixed slots are immovable**: Opening ceremony, lunch breaks, and closing ceremony times cannot change
- **Priority ordering**: keynote > workshop > panel > talk > networking > break

## Conflict Resolution Strategy
1. Detect ALL conflicts in the proposed schedule
2. Classify by severity: HARD (same room + same time) vs SOFT (speaker preference violated, capacity warning)
3. Resolve HARD conflicts FIRST using constraint relaxation (move lower-priority session)
4. For SOFT conflicts, propose alternatives and flag for organizer review
5. After resolution, identify affected participants for notification

## CRITICAL: Output Format
You MUST respond with ONLY a valid JSON object. No markdown, no explanation outside JSON. Match this EXACT structure:

{
  "action": "schedule_created" | "schedule_updated" | "conflict_resolved" | "what_if_analysis",
  "timeline": [
    {
      "id": "session_uuid",
      "title": "Session Title",
      "session_type": "keynote" | "workshop" | "panel" | "talk" | "networking" | "break",
      "speaker": "Speaker Name" or "",
      "venue": "Room Name",
      "day": 1,
      "start_time": "09:00",
      "end_time": "10:00",
      "capacity": 200,
      "status": "scheduled" | "moved" | "cancelled"
    }
  ],
  "conflicts_found": [
    {
      "type": "room_overlap" | "speaker_double_booking" | "time_violation" | "capacity_exceeded",
      "severity": "hard" | "soft",
      "description": "Room A is double-booked at 10:00 AM",
      "sessions_involved": ["session_id_1", "session_id_2"]
    }
  ],
  "conflicts_resolved": [
    {
      "conflict_type": "room_overlap",
      "action_taken": "Moved Workshop B from Room A to Room C",
      "sessions_moved": ["session_id_2"],
      "participants_affected": 45
    }
  ],
  "warnings": ["Room A may be at 95% capacity for the keynote"],
  "cascade_to": [
    {
      "agent": "hermes",
      "task": "notify_schedule_change",
      "data": {"affected_participants": 87, "changes": "Workshop B moved from 2 PM to 10 AM"}
    },
    {
      "agent": "apollo",
      "task": "update_content",
      "data": {"old_time": "10:00 AM", "new_time": "2:00 PM", "session": "Keynote"}
    }
  ],
  "reasoning": "Detailed explanation of scheduling decisions, conflict resolution logic, and why these choices minimize disruption"
}

IMPORTANT NOTES:
- cascade_to should ONLY be included when schedule changes affect previously confirmed arrangements
- For new schedule creation (no prior schedule), do NOT cascade since nothing needs updating
- Generate realistic session IDs using short UUIDs like "sess_abc123"
- Always explain your reasoning thoroughly — this is visible to the organizer
"""


# ============================================================================
# CHRONOS AGENT — Main function (replaces scheduler_agent_stub)
# ============================================================================

async def chronos_agent(state: dict) -> dict:
    """
    Real LLM-powered Scheduler Agent.

    Reads event context and constraints from the shared LangGraph state,
    calls Gemini to generate/optimize a schedule, detects and resolves
    conflicts, and emits cascading tasks to Hermes/Apollo when schedule
    changes affect participants.

    Args:
        state: The full NexusState dict from LangGraph

    Returns:
        Partial state update with scheduler_output key
    """
    user_input = state.get("user_input", "")
    event = state.get("event", {})
    participants = state.get("participants", [])
    schedule = state.get("schedule", [])
    pending_tasks = state.get("pending_tasks", [])

    # ---- Build context for the LLM ----
    event_name = event.get("name", "TechFest 2026") if event else "TechFest 2026"
    event_days = event.get("days", 1) if event else 1
    event_venues = event.get("venues", []) if event else []
    participant_count = len(participants) if participants else 0

    # Check if this is a cascading task / update request
    cascade_context = ""
    if pending_tasks:
        current_task = pending_tasks[0] if pending_tasks else {}
        task_type = current_task.get("task", "")
        task_data = current_task.get("data", {})
        if task_type == "reschedule_session":
            cascade_context = (
                f"\n\nIMPORTANT: This is a RESCHEDULE request. "
                f"Details: {json.dumps(task_data, default=str)}. "
                f"Modify the existing schedule to accommodate this change. "
                f"Detect any new conflicts created by the change and resolve them. "
                f"Then cascade to Hermes and Apollo with the changes."
            )

    # Format existing schedule for context
    existing_schedule_str = "No existing schedule."
    if schedule:
        existing_schedule_str = json.dumps(schedule[:10], default=str, indent=2)  # Cap at 10 for token savings
        if len(schedule) > 10:
            existing_schedule_str += f"\n... and {len(schedule) - 10} more sessions"

    # Format venues if available
    venues_str = "No venue data provided. Use reasonable defaults (Main Hall: 500 capacity, Room A: 100, Room B: 80, Room C: 60)."
    if event_venues:
        venues_str = json.dumps(event_venues, default=str)

    # Build the user message with full context
    user_message = f"""Build or optimize a schedule for the following event:

**Event:** {event_name}
**Days:** {event_days}
**Registered Participants:** {participant_count or 'TBD'}
**Available Venues:** {venues_str}

**Existing Schedule:** {existing_schedule_str}

**Organizer's Request:** {user_input}
{cascade_context}

Generate an optimized schedule. Detect and resolve any conflicts. If this modifies an existing schedule that has already been communicated, include cascade_to entries to notify Hermes (mail) and Apollo (content) of the changes. Respond with ONLY the JSON object as specified."""

    # ---- Call the LLM ----
    try:
        llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            api_key=settings.GEMINI_API_KEY,
            temperature=0.3,  # Lower temperature for structured scheduling (more deterministic)
        )

        response = await llm.ainvoke([
            {"role": "system", "content": CHRONOS_SYSTEM_PROMPT},
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

        # Timeline
        timeline = []
        for session in parsed.get("timeline", []):
            session_entry = {
                "id": session.get("id", f"sess_{uuid.uuid4().hex[:8]}"),
                "title": session.get("title", "Untitled Session"),
                "session_type": session.get("session_type", "talk"),
                "speaker": session.get("speaker", ""),
                "venue": session.get("venue", "TBD"),
                "day": session.get("day", 1),
                "start_time": session.get("start_time", "09:00"),
                "end_time": session.get("end_time", "10:00"),
                "capacity": session.get("capacity"),
                "status": session.get("status", "scheduled"),
            }
            timeline.append(session_entry)

        # Update the state manager's schedule
        if timeline:
            state_manager.set_schedule(timeline)

            # ---- Persist sessions to database ----
            from app.repository import insert_session
            event = state_manager.get_event()
            event_id = event.get("id", "default") if event else "default"
            for session in timeline:
                try:
                    await insert_session(event_id, session)
                except Exception as db_err:
                    print(f"[Chronos] DB insert for session '{session.get('title')}' failed: {db_err}")

        # Conflicts found
        conflicts_found = []
        for conflict in parsed.get("conflicts_found", []):
            conflicts_found.append({
                "type": conflict.get("type", "unknown"),
                "severity": conflict.get("severity", "soft"),
                "description": conflict.get("description", ""),
                "sessions_involved": conflict.get("sessions_involved", []),
            })

        # Conflicts resolved
        conflicts_resolved = []
        total_affected = 0
        for resolution in parsed.get("conflicts_resolved", []):
            affected = resolution.get("participants_affected", 0)
            total_affected += affected
            conflicts_resolved.append({
                "conflict_type": resolution.get("conflict_type", "unknown"),
                "action_taken": resolution.get("action_taken", ""),
                "sessions_moved": resolution.get("sessions_moved", []),
                "participants_affected": affected,
            })

        # Warnings
        warnings = parsed.get("warnings", [])

        # Reasoning
        reasoning = parsed.get("reasoning", "Schedule generated successfully by Chronos.")

        # Cascade tasks (only if the LLM flagged them)
        cascade_to = parsed.get("cascade_to", [])

        # ---- Build approval items ----
        action = parsed.get("action", "schedule_created")
        approval_items = []
        needs_approval = False

        # Only request approval if schedule was modified (not for new creation)
        if action in ("schedule_updated", "conflict_resolved") and total_affected > 0:
            needs_approval = True
            approval_items.append({
                "id": f"approval_chronos_{uuid.uuid4().hex[:8]}",
                "agent": "chronos",
                "action": "apply_schedule_changes",
                "description": f"Apply schedule changes affecting {total_affected} participant(s)",
                "impact": f"{len(conflicts_resolved)} conflict(s) resolved, {len(timeline)} session(s) in final schedule",
                "preview": {
                    "conflicts_resolved": len(conflicts_resolved),
                    "sessions_moved": sum(len(r["sessions_moved"]) for r in conflicts_resolved),
                    "participants_affected": total_affected,
                },
            })

        return {
            "scheduler_output": {
                "action": action,
                "timeline": timeline,
                "conflicts_found": conflicts_found,
                "conflicts_resolved": conflicts_resolved,
                "warnings": warnings,
                "reasoning": reasoning,
                "cascade_to": cascade_to,
                "requires_approval": needs_approval,
                "approval_items": approval_items,
            },
        }

    except json.JSONDecodeError as e:
        return _build_error_response(
            f"Chronos received a response from the LLM but couldn't parse it as JSON: {str(e)}",
            user_input, event_name,
        )

    except Exception as e:
        return _build_error_response(
            f"Chronos encountered an error: {str(e)}",
            user_input, event_name,
        )


# ============================================================================
# ERROR FALLBACK — Returns structured schedule even on failure
# ============================================================================

def _build_error_response(error_msg: str, user_input: str, event_name: str) -> dict:
    """
    Build a graceful error response so the graph never crashes.
    Returns a scheduler_output with a minimal fallback schedule
    and the error in the reasoning field.
    """
    return {
        "scheduler_output": {
            "action": "schedule_created",
            "timeline": [
                {
                    "id": f"sess_{uuid.uuid4().hex[:8]}",
                    "title": "Opening Ceremony",
                    "session_type": "keynote",
                    "speaker": "Event Organizer",
                    "venue": "Main Hall",
                    "day": 1,
                    "start_time": "09:00",
                    "end_time": "09:30",
                    "capacity": 500,
                    "status": "scheduled",
                },
                {
                    "id": f"sess_{uuid.uuid4().hex[:8]}",
                    "title": "Keynote Address",
                    "session_type": "keynote",
                    "speaker": "TBD",
                    "venue": "Main Hall",
                    "day": 1,
                    "start_time": "09:45",
                    "end_time": "10:45",
                    "capacity": 500,
                    "status": "scheduled",
                },
                {
                    "id": f"sess_{uuid.uuid4().hex[:8]}",
                    "title": "Lunch Break",
                    "session_type": "break",
                    "speaker": "",
                    "venue": "Cafeteria",
                    "day": 1,
                    "start_time": "12:30",
                    "end_time": "13:30",
                    "capacity": 500,
                    "status": "scheduled",
                },
            ],
            "conflicts_found": [],
            "conflicts_resolved": [],
            "warnings": ["Fallback schedule generated due to error — review carefully."],
            "reasoning": (
                f"[FALLBACK] {error_msg}. "
                f"Chronos generated a minimal fallback schedule for '{user_input[:80]}'. "
                "Please retry or check your API key configuration."
            ),
            "cascade_to": [],
            "requires_approval": False,
            "approval_items": [],
        },
    }
