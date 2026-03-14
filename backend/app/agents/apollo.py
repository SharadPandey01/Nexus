# ============================================================================
# NEXUS BACKEND — Apollo Agent (Content Strategist & Social Media)
# ============================================================================
# Apollo is the creative marketing mind of the Nexus swarm.
#
# Capabilities:
#   1. Content generation   — platform-specific posts (Twitter, LinkedIn, Instagram, email)
#   2. Campaign planning    — multi-post narrative arc (Teaser → Reveal → Countdown → D-Day → Recap)
#   3. Engagement analysis  — recommend optimal posting times by platform
#   4. Content updates      — modify queued content when schedule changes (cascade from Chronos)
#   5. Content queue        — add to publication queue with status tracking
#
# Inter-agent interactions:
#   ← Chronos: "Keynote time changed" → updates queued posts
#   ← Athena:  "Registration slowing" → generates urgency content
#   → Hermes:  Can cascade to trigger email blasts for content promotion
#
# Replaces: content_agent_stub in stubs.py
# ============================================================================

import json
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings
from app.state.state_manager import state_manager


# ============================================================================
# SYSTEM PROMPT — Apollo's identity and instructions (from doc3 §3.2)
# ============================================================================

APOLLO_SYSTEM_PROMPT = """You are Apollo, the creative marketing mind for the Nexus Event Intelligence Platform.

Your role: Generate compelling promotional content, plan social media campaigns, and optimize posting schedules. You always provide multiple variants for the organizer to choose from.

## Your Capabilities
1. **Content Generation** — Create platform-specific promotional copy from event details
2. **Campaign Planning** — Design multi-post campaign arcs to build event hype
3. **Engagement Analysis** — Recommend optimal posting times based on platform best practices
4. **Content Updates** — Modify queued content when event details change

## Platform Rules (STRICTLY FOLLOW THESE)
- **Twitter/X**: Max 280 characters. Punchy, emoji-forward, 2-4 hashtags. Thread format for longer content.
- **LinkedIn**: Professional tone, longer-form (150-300 words). Industry language, 3-5 relevant hashtags. No excessive emojis.
- **Instagram**: Visual-first. Emoji-heavy, include an `image_prompt` describing a striking visual asset. 5-8 hashtags.
- **Email**: Subject line (max 60 chars) + body preview. Include personalization hooks like {{name}}.

## Content Strategy
- Generate ONLY 1 variant matching the requested tone (or professional by default)
- Mark this single variant as `is_recommended: true`

- Include `image_prompt` for visual platforms (Instagram always, others when compelling)
- Suggest specific posting times with brief reasoning

## Engagement Timing Best Practices (use when no historical data is available)
- LinkedIn: Tuesday-Thursday, 9-11 AM. Best day: Wednesday.
- Twitter/X: Monday-Friday, 12-3 PM. Best day: Wednesday.
- Instagram: Monday, Wednesday, Friday. 11 AM or 7-8 PM. Best day: Wednesday.
- Email: Tuesday-Thursday, 10 AM. Best day: Tuesday.

## CRITICAL: Output Format
You MUST respond with ONLY a valid JSON object. No markdown, no explanation outside JSON. Match this EXACT structure:

{
  "content_pieces": [
    {
      "platform": "twitter" | "linkedin" | "instagram" | "email",
      "tone": "professional" | "hype" | "casual" | "technical",
      "text": "The actual post content",
      "hashtags": ["#Tag1", "#Tag2"],
      "suggested_time": "10:00 AM Wednesday",
      "image_prompt": "Description of a visual asset" or null,
      "is_recommended": true or false
    }
  ],
  "campaign_timeline": {
    "phases": ["Teaser", "Reveal", "Countdown", "D-Day", "Recap"],
    "total_posts": 15,
    "duration_days": 14
  },
  "engagement_insights": {
    "best_day": "Wednesday",
    "best_time": "10:00 AM",
    "top_content_type": "visual" | "text" | "thread",
    "insights": ["Insight 1", "Insight 2"]
  },
  "reasoning": "Your explanation of creative choices, why you picked these tones, platforms, and timings"
}
"""


# ============================================================================
# APOLLO AGENT — Main function (replaces content_agent_stub)
# ============================================================================

async def apollo_agent(state: dict) -> dict:
    """
    Real LLM-powered Content Strategist Agent.
    
    Reads event context from the shared LangGraph state, calls Gemini
    to generate platform-specific promotional content, and returns a
    structured content_output matching the orchestrator's contract.
    
    Args:
        state: The full NexusState dict from LangGraph
        
    Returns:
        Partial state update with content_output key
    """
    user_input = state.get("user_input", "")
    event = state.get("event", {})
    content_queue = state.get("content_queue", [])
    participants = state.get("participants", [])
    schedule = state.get("schedule", [])
    pending_tasks = state.get("pending_tasks", [])

    # ---- Build context for the LLM ----
    event_name = event.get("name", "TechFest 2026") if event else "TechFest 2026"
    event_desc = event.get("description", "") if event else ""
    event_location = event.get("location", "") if event else ""
    event_days = event.get("days", 1) if event else 1
    participant_count = len(participants) if participants else 0

    # Check if this is a cascading task from another agent (e.g., Chronos)
    cascade_context = ""
    if pending_tasks:
        current_task = pending_tasks[0] if pending_tasks else {}
        task_type = current_task.get("task", "")
        task_data = current_task.get("data", {})
        if task_type == "update_content":
            cascade_context = (
                f"\n\nIMPORTANT: This is a CASCADE request from the Scheduler agent. "
                f"The schedule has changed. Details: {json.dumps(task_data, default=str)}. "
                f"Update any content that mentions old times/sessions. "
                f"Generate corrected variants that reflect the new schedule."
            )
        elif task_type == "generate_urgency_content":
            cascade_context = (
                f"\n\nIMPORTANT: This is a CASCADE request from the Analytics agent. "
                f"Insight: {task_data.get('insight', 'Registration is slowing')}. "
                f"Generate URGENCY-focused content to drive registrations. "
                f"Use scarcity language and time-pressure tactics."
            )

    # Build the user message with full context
    user_message = f"""Generate promotional content for the following event:

**Event:** {event_name}
**Description:** {event_desc or 'A large-scale technical event'}
**Location:** {event_location or 'To be announced'}
**Duration:** {event_days} day(s)
**Registered Participants:** {participant_count or 'TBD'}

**Organizer's Request:** {user_input}
**Platforms:** Twitter, LinkedIn, Instagram, Email (Generate 1 post for EACH of these unless specified otherwise)

**Current Content Queue:** {len(content_queue)} items already queued
**Current Schedule:** {len(schedule)} sessions scheduled
{cascade_context}

Generate platform-appropriate content. **CRITICAL: Generate EXACTLY 1 content piece PER PLATFORM to conserve tokens.** Include a campaign timeline and engagement insights. Respond with ONLY the JSON object as specified."""

    # ---- Call the LLM ----
    try:
        llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            api_key=settings.GEMINI_API_KEY,
            temperature=0.7,  # Higher temperature for creative content
        )

        response = await llm.ainvoke([
            {"role": "system", "content": APOLLO_SYSTEM_PROMPT},
            {"role": "human", "content": user_message},
        ])

        # ---- Parse the LLM response ----
        raw_text = response.content.strip()

        # Strip markdown code fences if the LLM wraps the JSON
        if raw_text.startswith("```"):
            # Remove ```json or ``` prefix and ``` suffix
            lines = raw_text.split("\n")
            # Find first line that isn't a fence
            start = 1  # skip the ``` line
            end = len(lines) - 1  # skip the last ``` line
            if lines[end].strip() == "```":
                end = end
            raw_text = "\n".join(lines[start:end])

        parsed = json.loads(raw_text)

        # ---- Build the structured output ----
        content_pieces = []
        for i, piece in enumerate(parsed.get("content_pieces", [])):
            content_id = f"content_{uuid.uuid4().hex[:8]}"
            content_piece = {
                "id": content_id,
                "platform": piece.get("platform", "twitter"),
                "tone": piece.get("tone", "professional"),
                "text": piece.get("text", ""),
                "hashtags": piece.get("hashtags", []),
                "suggested_time": piece.get("suggested_time", ""),
                "image_prompt": piece.get("image_prompt"),
                "is_recommended": piece.get("is_recommended", False),
                "status": "draft",
            }
            content_pieces.append(content_piece)

            # Add to the state manager's content queue
            state_manager.add_content(content_piece)

            # ---- Persist to database ----
            from app.repository import insert_content
            event = state_manager.get_event()
            event_id = event.get("id", "default") if event else "default"
            try:
                await insert_content(event_id, {
                    "id": content_id,
                    "content_type": "social_post",
                    "platform": piece.get("platform"),
                    "title": piece.get("text", "")[:60],
                    "body": piece.get("text", ""),
                    "tone": piece.get("tone"),
                    "hashtags": ",".join(piece.get("hashtags", [])),
                    "status": "draft",
                    "reasoning": parsed.get("reasoning", ""),
                })
            except Exception as db_err:
                print(f"[Apollo] DB insert for content '{content_id}' failed: {db_err}")

        # Campaign timeline
        campaign = parsed.get("campaign_timeline", {})
        campaign_timeline = {
            "phases": campaign.get("phases", ["Teaser", "Reveal", "Countdown", "D-Day", "Recap"]),
            "total_posts": campaign.get("total_posts", len(content_pieces) * 3),
            "duration_days": campaign.get("duration_days", 14),
        }

        # Engagement insights
        insights_raw = parsed.get("engagement_insights", {})
        engagement_insights = {
            "best_day": insights_raw.get("best_day", "Wednesday"),
            "best_time": insights_raw.get("best_time", "10:00 AM"),
            "top_content_type": insights_raw.get("top_content_type", "visual"),
            "insights": insights_raw.get("insights", []),
        }

        reasoning = parsed.get("reasoning", "Content generated successfully by Apollo.")

        # ---- Build approval items ----
        approval_items = [
            {
                "id": f"approval_apollo_{uuid.uuid4().hex[:8]}",
                "agent": "apollo",
                "action": "publish_content",
                "description": f"Publish {len(content_pieces)} content piece(s) across platforms",
                "impact": f"Will queue {len(content_pieces)} posts for publishing",
                "preview": {
                    "platforms": list(set(p["platform"] for p in content_pieces)),
                    "piece_count": len(content_pieces),
                    "first_piece": content_pieces[0]["text"][:100] if content_pieces else "",
                },
            }
        ]

        return {
            "content_output": {
                "content_pieces": content_pieces,
                "campaign_timeline": campaign_timeline,
                "engagement_insights": engagement_insights,
                "reasoning": reasoning,
                "requires_approval": True,
                "approval_items": approval_items,
            },
        }

    except json.JSONDecodeError as e:
        # LLM returned malformed JSON — return a structured error
        return _build_error_response(
            f"Apollo received a response from the LLM but couldn't parse it as JSON: {str(e)}",
            user_input, event_name,
        )

    except Exception as e:
        # Any other error (network, rate limit, etc.)
        return _build_error_response(
            f"Apollo encountered an error: {str(e)}",
            user_input, event_name,
        )


# ============================================================================
# ERROR FALLBACK — Returns structured content even on failure
# ============================================================================

def _build_error_response(error_msg: str, user_input: str, event_name: str) -> dict:
    """
    Build a graceful error response so the graph never crashes.
    Returns a content_output with a single fallback content piece
    and the error in the reasoning field.
    """
    fallback_id = f"content_{uuid.uuid4().hex[:8]}"
    return {
        "content_output": {
            "content_pieces": [
                {
                    "id": fallback_id,
                    "platform": "linkedin",
                    "tone": "professional",
                    "text": f"🚀 {event_name} is coming! Stay tuned for exciting announcements about our upcoming event. #TechEvent #Innovation",
                    "hashtags": ["#TechEvent", "#Innovation", "#ComingSoon"],
                    "suggested_time": "10:00 AM Wednesday",
                    "image_prompt": None,
                    "is_recommended": True,
                    "status": "draft",
                },
            ],
            "campaign_timeline": {
                "phases": ["Teaser", "Reveal", "Countdown", "D-Day", "Recap"],
                "total_posts": 5,
                "duration_days": 14,
            },
            "engagement_insights": {
                "best_day": "Wednesday",
                "best_time": "10:00 AM",
                "top_content_type": "text",
                "insights": ["Using platform best-practice defaults due to error."],
            },
            "reasoning": (
                f"[FALLBACK] {error_msg}. "
                f"Apollo generated a safe fallback post for '{user_input[:80]}'. "
                "Please retry or check your API key configuration."
            ),
            "requires_approval": True,
            "approval_items": [
                {
                    "id": f"approval_apollo_{uuid.uuid4().hex[:8]}",
                    "agent": "apollo",
                    "action": "publish_content",
                    "description": "Publish fallback content (generated due to LLM error)",
                    "impact": "Will queue 1 fallback post",
                    "preview": {"platforms": ["linkedin"], "piece_count": 1},
                }
            ],
        },
    }

'''
- If a campaign timeline is explicitly requested: build a brief narrative arc
'''