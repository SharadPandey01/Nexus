# ============================================================================
# NEXUS BACKEND — Athena Agent (Real-Time Analytics & Intelligence)
# ============================================================================
# Athena is the data intelligence brain of the Nexus swarm.
#
# Capabilities (from doc3 §3.3):
#   1. Registration analytics — track signups over time, predict attendance
#   2. Capacity planning — warn when sessions approach room capacity limits
#   3. Engagement scoring — score participants by involvement level
#   4. Risk detection — flag issues like unconfirmed speakers, no room backups
#   5. Post-event summary — auto-generate event report with key metrics
#
# Inter-agent interactions:
#   → Apollo:   "Registration slowing — generate urgency promotional push"
#   → Chronos:  "Room capacity mismatch — suggest room swap"
#   → Hermes:   "15 speakers haven't confirmed — draft follow-up emails"
#   ← Orchestrator: Triggered by analytics requests or dashboard loads
#
# Replaces: analytics_agent_stub in stubs.py
# ============================================================================

import json
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings
from app.state.state_manager import state_manager


# ============================================================================
# SYSTEM PROMPT — Athena's identity and instructions (from doc3 §3.3)
# ============================================================================

ATHENA_SYSTEM_PROMPT = """You are Athena, the real-time analytics and intelligence engine for the Nexus Event Intelligence Platform.

Your role: Analyze event data (participants, schedule, capacity) to provide actionable insights, detect risks, and recommend optimizations. You turn raw data into intelligence that helps organizers make better decisions.

## Your Capabilities
1. **Registration Analytics** — Analyze participant data to track signups, predict attendance, and identify demographic patterns
2. **Capacity Planning** — Compare session registrations vs room capacities and flag overcrowding risks
3. **Risk Detection** — Identify issues like unconfirmed speakers, schedule gaps, low registration sessions
4. **Engagement Scoring** — Assess which sessions and tracks are most popular
5. **Event Summary** — Generate a comprehensive event overview with key metrics and KPIs

## Insight Categories (use appropriate icons)
- 📊 **Registration/Trend**: Signup velocity, total counts, growth patterns
- ⚠️ **Capacity Warning**: Room size vs registrant count mismatches
- 🎯 **Demographic**: Audience composition breakdowns (students, professionals, speakers)
- 🔥 **Engagement**: Popular sessions, trending tracks, hot topics
- ⚡ **Risk**: Unconfirmed speakers, empty time slots, budget concerns

## Severity Levels
- **info**: General observation, no action needed
- **warning**: Attention recommended, potential issue
- **critical**: Immediate action required, problem detected

## Cascading Rules
When analysis reveals actionable issues, include cascade_to entries:
- Registration slowing → cascade to Apollo for urgency content
- Room capacity exceeded → cascade to Chronos for room swap
- Speakers unconfirmed → cascade to Hermes for follow-up emails

## CRITICAL: Output Format
You MUST respond with ONLY a valid JSON object. No markdown, no explanation outside JSON. Match this EXACT structure:

{
  "insights": [
    {
      "type": "registration_trend" | "capacity_warning" | "demographic" | "engagement" | "risk",
      "icon": "📊" | "⚠️" | "🎯" | "🔥" | "⚡",
      "message": "Clear, actionable insight in natural language",
      "severity": "info" | "warning" | "critical"
    }
  ],
  "risk_items": [
    {
      "risk": "Description of the potential problem",
      "severity": "low" | "medium" | "high",
      "recommendation": "What to do about it"
    }
  ],
  "capacity_warnings": [
    {
      "session_title": "Workshop Name",
      "venue": "Room A",
      "registrants": 45,
      "capacity": 40,
      "recommendation": "Move to Room B (60 seats)"
    }
  ],
  "metrics": {
    "total_participants": 142,
    "total_sessions": 12,
    "capacity_utilization": "78%",
    "risk_count": 2,
    "most_popular_session": "AI Keynote",
    "demographic_breakdown": {"students": "42%", "professionals": "38%", "speakers": "10%", "other": "10%"}
  },
  "cascade_to": [
    {
      "agent": "apollo",
      "task": "generate_urgency_content",
      "data": {"insight": "Registration velocity 23% below target"}
    }
  ],
  "reasoning": "Detailed explanation of analysis methodology, data sources used, and confidence levels"
}

IMPORTANT NOTES:
- Generate AT LEAST 3 insights covering different categories
- Always include metrics with concrete numbers (use estimates if data is sparse)
- Only cascade when analysis reveals a genuine actionable issue
- Be specific with numbers and percentages — vague insights are useless
- If participant or schedule data is minimal, still generate useful insights using reasonable estimates
"""


# ============================================================================
# ATHENA AGENT — Main function (replaces analytics_agent_stub)
# ============================================================================

async def athena_agent(state: dict) -> dict:
    """
    Real LLM-powered Analytics & Intelligence Agent.

    Reads participant data, schedule, and event context from the shared
    LangGraph state, calls Gemini to analyze patterns, detect risks, and
    provide actionable intelligence.

    Args:
        state: The full NexusState dict from LangGraph

    Returns:
        Partial state update with analytics_output key
    """
    user_input = state.get("user_input", "")
    event = state.get("event", {})
    participants = state.get("participants", [])
    schedule = state.get("schedule", [])
    content_queue = state.get("content_queue", [])

    # ---- Build context for the LLM ----
    event_name = event.get("name", "TechFest 2026") if event else "TechFest 2026"
    event_days = event.get("days", 1) if event else 1
    participant_count = len(participants) if participants else 0

    # Format participant data for analysis (cap at 10 for token savings)
    participant_context = "No participant data uploaded yet. Use reasonable estimates for a tech summit."
    if participants:
        sample = participants[:10]
        participant_context = (
            f"{participant_count} total participants. Sample data:\n"
            f"{json.dumps(sample, default=str, indent=2)}"
        )
        if participant_count > 10:
            participant_context += f"\n... and {participant_count - 10} more"

    # Format schedule for analysis
    schedule_context = "No schedule data available. Use reasonable estimates."
    if schedule:
        schedule_context = (
            f"{len(schedule)} sessions scheduled:\n"
            f"{json.dumps(schedule[:8], default=str, indent=2)}"
        )
        if len(schedule) > 8:
            schedule_context += f"\n... and {len(schedule) - 8} more sessions"

    # Content queue info
    content_info = f"{len(content_queue)} items in content queue." if content_queue else "Content queue is empty."

    # Build the user message
    user_message = f"""Analyze the following event data and provide actionable intelligence:

**Event:** {event_name}
**Duration:** {event_days} day(s)

**Participant Data:**
{participant_context}

**Schedule Data:**
{schedule_context}

**Content Queue:** {content_info}

**Organizer's Request:** {user_input}

Analyze this data comprehensively. Provide insights, detect risks, check capacity, and compute key metrics. If you find actionable issues, include cascade_to entries for the relevant agents. Respond with ONLY the JSON object as specified."""

    # ---- Call the LLM ----
    try:
        llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.3,  # Lower temperature for analytical accuracy
        )

        response = await llm.ainvoke([
            {"role": "system", "content": ATHENA_SYSTEM_PROMPT},
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

        # Insights
        insights = []
        for item in parsed.get("insights", []):
            insights.append({
                "type": item.get("type", "registration_trend"),
                "icon": item.get("icon", "📊"),
                "message": item.get("message", ""),
                "severity": item.get("severity", "info"),
            })

        # Risk items
        risk_items = []
        for item in parsed.get("risk_items", []):
            risk_items.append({
                "risk": item.get("risk", ""),
                "severity": item.get("severity", "medium"),
                "recommendation": item.get("recommendation", ""),
            })

        # Capacity warnings
        capacity_warnings = []
        for item in parsed.get("capacity_warnings", []):
            capacity_warnings.append({
                "session_title": item.get("session_title", ""),
                "venue": item.get("venue", ""),
                "registrants": item.get("registrants", 0),
                "capacity": item.get("capacity", 0),
                "recommendation": item.get("recommendation", ""),
            })

        # Metrics
        metrics = parsed.get("metrics", {
            "total_participants": participant_count,
            "total_sessions": len(schedule),
            "capacity_utilization": "N/A",
            "risk_count": len(risk_items),
        })

        # Cascade tasks
        cascade_to = parsed.get("cascade_to", [])

        reasoning = parsed.get("reasoning", "Analytics generated successfully by Athena.")

        return {
            "analytics_output": {
                "insights": insights,
                "risk_items": risk_items,
                "capacity_warnings": capacity_warnings,
                "metrics": metrics,
                "cascade_to": cascade_to,
                "reasoning": reasoning,
            },
        }

    except json.JSONDecodeError as e:
        return _build_error_response(
            f"Athena received a response from the LLM but couldn't parse it as JSON: {str(e)}",
            participant_count, len(schedule),
        )

    except Exception as e:
        return _build_error_response(
            f"Athena encountered an error: {str(e)}",
            participant_count, len(schedule),
        )


# ============================================================================
# ERROR FALLBACK — Returns structured analytics even on failure
# ============================================================================

def _build_error_response(error_msg: str, participant_count: int, session_count: int) -> dict:
    """
    Build a graceful error response so the graph never crashes.
    Returns an analytics_output with basic fallback metrics
    and the error in the reasoning field.
    """
    return {
        "analytics_output": {
            "insights": [
                {
                    "type": "registration_trend",
                    "icon": "📊",
                    "message": f"Total registrations: {participant_count}.",
                    "severity": "info",
                },
                {
                    "type": "engagement",
                    "icon": "🔥",
                    "message": f"{session_count} sessions currently scheduled.",
                    "severity": "info",
                },
            ],
            "risk_items": [],
            "capacity_warnings": [],
            "metrics": {
                "total_participants": participant_count,
                "total_sessions": session_count,
                "capacity_utilization": "N/A",
                "risk_count": 0,
            },
            "cascade_to": [],
            "reasoning": (
                f"[FALLBACK] {error_msg}. "
                "Athena generated basic metrics from available data. "
                "Please retry or check your API key configuration."
            ),
        },
    }
