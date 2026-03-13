# ============================================================================
# NEXUS BACKEND — Mock Agent Stubs
# ============================================================================
# These are PLACEHOLDER agent implementations that return structured
# dummy data. They let the entire system work end-to-end without
# real LLM calls.
#
# The remote AI dev will REPLACE these with real LLM-powered agents:
# - scheduler_agent_stub → becomes the real Chronos agent
# - mailer_agent_stub    → becomes the real Hermes agent
# - content_agent_stub   → becomes the real Apollo agent
# - analytics_agent_stub → becomes the real Athena agent
#
# Each stub follows the same contract:
# - Receives the full NexusState
# - Returns a partial state update (dict with the agent's output key)
# - Can include "cascade_to" to trigger other agents
# - Can include "requires_approval" for human-in-the-loop
# ============================================================================

from typing import Any, Dict
from datetime import datetime


async def scheduler_agent_stub(state: dict) -> dict:
    """
    Mock Scheduler Agent (Chronos).
    
    In production, this would:
    1. Parse scheduling constraints from user_input
    2. Call the LLM to generate/optimize a schedule
    3. Detect conflicts using constraint logic
    4. Resolve conflicts autonomously
    5. Emit cascading tasks to Mail Agent (notify affected participants)
    
    For now, returns a mock schedule result.
    """
    user_input = state.get("user_input", "")

    return {
        "scheduler_output": {
            "action": "schedule_created",
            "timeline": [
                {
                    "id": "session_1",
                    "title": "Opening Ceremony",
                    "type": "keynote",
                    "speaker": "Event Organizer",
                    "venue": "Main Hall",
                    "day": 1,
                    "start_time": "09:00",
                    "end_time": "09:30",
                },
                {
                    "id": "session_2",
                    "title": "Keynote: Future of AI",
                    "type": "keynote",
                    "speaker": "Dr. Smith",
                    "venue": "Main Hall",
                    "day": 1,
                    "start_time": "09:30",
                    "end_time": "10:30",
                },
                {
                    "id": "session_3",
                    "title": "Workshop: Building with LLMs",
                    "type": "workshop",
                    "speaker": "Jane Doe",
                    "venue": "Room A",
                    "day": 1,
                    "start_time": "11:00",
                    "end_time": "12:30",
                },
                {
                    "id": "session_4",
                    "title": "Lunch Break",
                    "type": "break",
                    "speaker": "",
                    "venue": "Cafeteria",
                    "day": 1,
                    "start_time": "12:30",
                    "end_time": "13:30",
                },
            ],
            "conflicts_found": [],
            "conflicts_resolved": [],
            "warnings": [
                "Main Hall may be at 90% capacity for the keynote"
            ],
            "reasoning": (
                f"[MOCK] Created a sample 1-day schedule based on request: '{user_input[:60]}'. "
                "In production, Chronos would use LLM to parse constraints and build an optimal timeline."
            ),
            # Example cascading: Scheduler can trigger Mail Agent
            # Uncomment to test cascading:
            # "cascade_to": [
            #     {
            #         "agent": "hermes",
            #         "task": "notify_schedule_change",
            #         "data": {"affected_participants": 42, "changes": "Schedule created"},
            #     }
            # ],
        },
    }


async def mailer_agent_stub(state: dict) -> dict:
    """
    Mock Mail Agent (Hermes).
    
    In production, this would:
    1. Parse CSV data to extract participant info
    2. Validate email addresses
    3. Segment participants by criteria
    4. Generate personalized email content using LLM
    5. Queue emails for sending (with approval)
    
    For now, returns a mock mail result.
    """
    user_input = state.get("user_input", "")
    participants = state.get("participants", [])

    return {
        "mailer_output": {
            "action_completed": "email_draft_created",
            "participants_processed": len(participants) if participants else 50,
            "invalid_emails": [
                {"email": "bad@", "reason": "Invalid format"},
                {"email": "missing@domain", "reason": "No TLD"},
            ],
            "segments_created": [
                {"name": "All Attendees", "count": 45},
                {"name": "Speakers", "count": 5},
            ],
            "preview_emails": [
                {
                    "to": "john@example.com",
                    "subject": "You're Invited to TechFest 2026!",
                    "body": "Dear John,\n\nWe're excited to invite you to TechFest 2026...",
                },
                {
                    "to": "jane@example.com",
                    "subject": "You're Invited to TechFest 2026!",
                    "body": "Dear Jane,\n\nWe're excited to invite you to TechFest 2026...",
                },
            ],
            "ready_to_send": True,
            "requires_approval": True,
            "approval_items": [
                {
                    "id": "approval_mail_1",
                    "agent": "hermes",
                    "action": "send_bulk_email",
                    "description": "Send invitation emails to all registered participants",
                    "impact": f"Will email {len(participants) if participants else 50} participants",
                    "preview": {"subject": "You're Invited!", "recipient_count": 50},
                }
            ],
            "reasoning": (
                f"[MOCK] Processed mail request: '{user_input[:60]}'. "
                "In production, Hermes would parse real CSV data, validate emails, "
                "and generate personalized content using LLM."
            ),
        },
    }


async def content_agent_stub(state: dict) -> dict:
    """
    Mock Content Agent (Apollo).
    
    In production, this would:
    1. Take event details and generate promotional content
    2. Create platform-specific variants (Twitter, LinkedIn, Instagram)
    3. Plan multi-post campaigns with narrative arcs
    4. Analyze engagement data for optimal posting times
    
    For now, returns mock content pieces.
    """
    user_input = state.get("user_input", "")
    event = state.get("event", {})
    event_name = event.get("name", "TechFest 2026") if event else "TechFest 2026"

    return {
        "content_output": {
            "content_pieces": [
                {
                    "id": "content_1",
                    "platform": "twitter",
                    "tone": "hype",
                    "text": f"🚀 {event_name} is coming! Join 500+ innovators for 3 days of cutting-edge tech, workshops, and networking. Don't miss out! #TechFest2026 #Innovation",
                    "hashtags": ["#TechFest2026", "#Innovation", "#Tech"],
                    "suggested_time": "10:00 AM Tuesday",
                },
                {
                    "id": "content_2",
                    "platform": "linkedin",
                    "tone": "professional",
                    "text": f"We're thrilled to announce {event_name}, a premier technology conference bringing together industry leaders, researchers, and innovators. Join us for insightful keynotes, hands-on workshops, and valuable networking opportunities.",
                    "hashtags": ["#TechConference", "#ProfessionalDevelopment"],
                    "suggested_time": "9:00 AM Wednesday",
                },
                {
                    "id": "content_3",
                    "platform": "instagram",
                    "tone": "casual",
                    "text": f"✨ Something amazing is brewing! {event_name} — 3 days of tech, fun, and the coolest people you'll meet this year. Save the date! 📅",
                    "hashtags": ["#TechFest", "#ComingSoon", "#TechCommunity"],
                    "suggested_time": "2:00 PM Monday",
                },
            ],
            "campaign_timeline": {
                "phases": ["Teaser", "Reveal", "Countdown", "D-Day", "Recap"],
                "total_posts": 15,
                "duration_days": 14,
            },
            "reasoning": (
                f"[MOCK] Generated 3 content variants for '{user_input[:60]}'. "
                "In production, Apollo would use LLM to create platform-optimized content "
                "with engagement analysis and campaign planning."
            ),
        },
    }


async def analytics_agent_stub(state: dict) -> dict:
    """
    Mock Analytics Agent (Athena).
    
    In production, this would:
    1. Analyze registration trends and predict attendance
    2. Check room capacity vs. registrations
    3. Score participant engagement
    4. Detect risks and flag issues
    5. Generate event reports
    
    For now, returns mock analytics data.
    """
    participants = state.get("participants", [])
    schedule = state.get("schedule", [])

    return {
        "analytics_output": {
            "insights": [
                {
                    "type": "registration_trend",
                    "icon": "📊",
                    "message": f"Total registrations: {len(participants) if participants else 127}. Registration velocity is on track.",
                    "severity": "info",
                },
                {
                    "type": "capacity_warning",
                    "icon": "⚠️",
                    "message": "Workshop C has 45 registrants but Room 2 only seats 40. Consider moving to Room 1.",
                    "severity": "warning",
                },
                {
                    "type": "demographic",
                    "icon": "🎯",
                    "message": "42% of registrants are students. Consider adding student-specific networking events.",
                    "severity": "info",
                },
            ],
            "risk_items": [
                {
                    "risk": "Speaker X hasn't confirmed attendance",
                    "severity": "high",
                    "recommendation": "Send follow-up email via Hermes",
                },
            ],
            "metrics": {
                "total_participants": len(participants) if participants else 127,
                "total_sessions": len(schedule) if schedule else 12,
                "capacity_utilization": "78%",
                "risk_count": 1,
            },
            "reasoning": (
                "[MOCK] Generated sample analytics insights. "
                "In production, Athena would analyze real registration data, "
                "capacity constraints, and historical patterns."
            ),
            # Example: Analytics can trigger other agents
            # "cascade_to": [
            #     {
            #         "agent": "apollo",
            #         "task": "generate_urgency_content",
            #         "data": {"insight": "Registration velocity slowing"},
            #     }
            # ],
        },
    }


async def fortuna_agent_stub(state: dict) -> dict:
    """
    Mock Finance/Sponsorship Agent (Fortuna).
    
    In production, this would:
    1. Analyze the event budget and compute spending velocity.
    2. Identify potential high-value sponsors based on the event theme.
    3. Draft sponsorship pitch emails for the organizer.
    4. Detect budget overruns and suggest cost-saving measures.
    
    For now, returns mock financial and sponsorship data.
    """
    user_input = state.get("user_input", "")

    return {
        "finance_output": {
            "total_budget": 50000.0,
            "total_spent": 12500.0,
            "remaining_balance": 37500.0,
            "line_items": [
                {"category": "Venue", "allocated": 20000.0, "spent": 10000.0, "status": "on_track"},
                {"category": "Marketing", "allocated": 5000.0, "spent": 2000.0, "status": "on_track"},
                {"category": "Catering", "allocated": 15000.0, "spent": 500.0, "status": "under_budget"},
            ],
            "sponsor_targets": [
                {
                    "id": "sponsor_1",
                    "company_name": "TechGlobal Corp",
                    "industry": "Cloud Computing",
                    "estimated_value": "$10,000",
                    "pitch_angle": "Focus on developer recruitment since 40% of attendees are students.",
                },
                {
                    "id": "sponsor_2",
                    "company_name": "StartUp Hub",
                    "industry": "Venture Capital",
                    "estimated_value": "$5,000",
                    "pitch_angle": "Pitch as an opportunity to scout early stage biotech projects.",
                }
            ],
            "requires_approval": True,
            "approval_items": [
                {
                    "id": "approval_finance_1",
                    "agent": "fortuna",
                    "action": "send_sponsor_pitch",
                    "description": "Send initial sponsorship pitch email to TechGlobal Corp.",
                    "impact": "Potential $10,000 revenue. Will email their VP of Marketing.",
                    "preview": {"subject": "Partnership Opportunity: TechFest 2026", "recipient": "vp@techglobal.com"},
                }
            ],
            "reasoning": (
                f"[MOCK] Processed finance request: '{user_input[:60]}'. "
                "In production, Fortuna would analyze actual budget constraints and use an LLM "
                "to match audience demographics to ideal corporate sponsors."
            ),
        },
    }
