# ============================================================================
# NEXUS BACKEND — Fortuna Agent (Finance & Sponsorship Intelligence)
# ============================================================================
# Fortuna is the financial oversight brain of the Nexus swarm.
#
# Capabilities (from doc3 §3.3):
#   1. Budget tracking — track vendor costs, venue fees, spending velocity
#   2. Cost estimation — estimate costs for schedule changes ("bigger room = $X more")
#   3. Sponsorship matching — identify ideal sponsors based on event theme & audience
#   4. Budget dashboard — generate a financial overview with line items
#   5. Spending alerts — warn when spending approaches or exceeds limits
#
# Inter-agent interactions:
#   ← Chronos: "Moving to a bigger room — what's the cost impact?"
#   → Hermes:  "Draft sponsorship pitch email to TechGlobal Corp"
#   ← Orchestrator: Triggered by finance/budget/sponsorship requests
#
# Replaces: fortuna_agent_stub in stubs.py
# ============================================================================

import json
import uuid
from typing import Any, Dict, List, Optional
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings
from app.state.state_manager import state_manager


# ============================================================================
# SYSTEM PROMPT — Fortuna's identity and instructions (from doc3 §3.3)
# ============================================================================

FORTUNA_SYSTEM_PROMPT = """You are Fortuna, the financial intelligence agent for the Nexus Event Intelligence Platform.

Your role: Provide financial oversight for the event — track budgets, estimate costs, identify sponsorship opportunities, and alert organizers when spending is off-track. You make the event financially viable.

## Your Capabilities
1. **Budget Tracking** — Track spending across categories (venue, marketing, catering, speakers, tech, miscellaneous)
2. **Cost Estimation** — Estimate cost impacts of schedule/venue changes
3. **Sponsorship Matching** — Identify ideal sponsors based on event theme, audience demographics, and industry alignment
4. **Budget Dashboard** — Generate a comprehensive financial overview with line items and status
5. **Spending Alerts** — Flag when categories are over-budget or approaching limits

## Budget Categories
- **Venue**: Room rentals, AV equipment, setup costs
- **Marketing**: Social media ads, printed materials, swag
- **Catering**: Food, beverages, dietary accommodations
- **Speakers**: Honorariums, travel, accommodation
- **Technology**: Streaming, event app, WiFi infrastructure
- **Miscellaneous**: Insurance, security, contingency

## Status Rules
- **on_track**: Spent ≤ 80% of allocated for this point in planning
- **over_budget**: Spent > 100% of allocated
- **under_budget**: Spent < 50% of allocated with significant timeline remaining
- **at_risk**: Spent 80-100% of allocated (trending toward overrun)

## Sponsorship Matching Rules
- Match sponsor industry to event themes (AI event → tech companies)
- Consider audience demographics (student-heavy → recruitment-focused sponsors)
- Estimate sponsorship value based on event size and visibility tier
- Generate specific pitch angles tailored to each sponsor's business goals

## CRITICAL: Output Format
You MUST respond with ONLY a valid JSON object. No markdown, no explanation outside JSON. Match this EXACT structure:

{
  "total_budget": 50000.00,
  "total_spent": 12500.00,
  "remaining_balance": 37500.00,
  "spending_velocity": "On track — 25% spent with 60% of planning time remaining",
  "line_items": [
    {
      "category": "Venue",
      "allocated": 20000.00,
      "spent": 10000.00,
      "status": "on_track" | "over_budget" | "under_budget" | "at_risk"
    }
  ],
  "alerts": [
    {
      "severity": "warning" | "critical" | "info",
      "message": "Catering costs are trending 15% above estimate",
      "recommendation": "Consider reducing menu options or negotiating bulk pricing"
    }
  ],
  "sponsor_targets": [
    {
      "id": "sponsor_uuid",
      "company_name": "TechGlobal Corp",
      "industry": "Cloud Computing",
      "estimated_value": "$10,000",
      "pitch_angle": "Focus on developer recruitment since 40% of attendees are students",
      "tier": "gold" | "silver" | "bronze" | "platinum"
    }
  ],
  "cost_impact": {
    "description": "Cost impact analysis of the requested change",
    "additional_cost": 5000.00,
    "savings": 0.00,
    "net_impact": 5000.00,
    "recommendation": "Proceed — within contingency budget"
  },
  "cascade_to": [
    {
      "agent": "hermes",
      "task": "send_sponsor_pitch",
      "data": {"company": "TechGlobal Corp", "pitch": "Partnership opportunity..."}
    }
  ],
  "reasoning": "Detailed explanation of financial analysis, sponsorship logic, and recommendations"
}

IMPORTANT NOTES:
- Always provide realistic, sensible budget numbers for a mid-size tech event
- If no specific budget data is provided, use reasonable defaults for a 500-person tech summit ($50,000 total budget)
- sponsor_targets should include 2-3 realistic companies with specific pitch angles
- cost_impact should only be included when a specific change is being evaluated
- Be proactive with alerts — financial problems are best caught early
"""


# ============================================================================
# FORTUNA AGENT — Main function (replaces fortuna_agent_stub)
# ============================================================================

async def fortuna_agent(state: dict) -> dict:
    """
    Real LLM-powered Finance & Sponsorship Agent.

    Reads event context, participant demographics, and schedule from the
    shared LangGraph state, calls Gemini to analyze budgets, match sponsors,
    and estimate costs.

    Args:
        state: The full NexusState dict from LangGraph

    Returns:
        Partial state update with finance_output key
    """
    user_input = state.get("user_input", "")
    event = state.get("event", {})
    participants = state.get("participants", [])
    schedule = state.get("schedule", [])
    pending_tasks = state.get("pending_tasks", [])

    # ---- Build context for the LLM ----
    event_name = event.get("name", "TechFest 2026") if event else "TechFest 2026"
    event_days = event.get("days", 1) if event else 1
    participant_count = len(participants) if participants else 0

    # Check for cascade from Chronos (cost impact of schedule change)
    cascade_context = ""
    if pending_tasks:
        current_task = pending_tasks[0] if pending_tasks else {}
        task_type = current_task.get("task", "")
        task_data = current_task.get("data", {})
        if task_type == "estimate_cost_impact":
            cascade_context = (
                f"\n\nIMPORTANT: This is a CASCADE request from Chronos (Scheduler). "
                f"Schedule change details: {json.dumps(task_data, default=str)}. "
                f"Estimate the financial impact of this change. Include cost_impact in your output."
            )

    # Format participant demographics summary (for sponsorship matching)
    demo_context = "No participant data. Assume a typical tech summit audience."
    if participants:
        demo_context = f"{participant_count} registered participants."
        # Try to extract demographic hints
        roles = {}
        for p in participants[:50]:  # Sample first 50
            role = p.get("role", p.get("Role", "attendee"))
            roles[role] = roles.get(role, 0) + 1
        if roles:
            demo_context += f" Role breakdown: {json.dumps(roles)}"

    # Schedule summary for cost estimation
    schedule_summary = f"{len(schedule)} sessions scheduled." if schedule else "No schedule data."

    # Build the user message
    user_message = f"""Analyze the finances and sponsorship opportunities for:

**Event:** {event_name}
**Duration:** {event_days} day(s)
**Participants:** {demo_context}
**Schedule:** {schedule_summary}

**Organizer's Request:** {user_input}
{cascade_context}

Provide a comprehensive financial overview with budget tracking, spending alerts, and sponsorship recommendations. Respond with ONLY the JSON object as specified."""

    # ---- Call the LLM ----
    try:
        llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            api_key=settings.GEMINI_API_KEY,
            temperature=0.3,  # Lower temperature for financial accuracy
        )

        response = await llm.ainvoke([
            {"role": "system", "content": FORTUNA_SYSTEM_PROMPT},
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
        total_budget = parsed.get("total_budget", 50000.0)
        total_spent = parsed.get("total_spent", 0.0)
        remaining_balance = parsed.get("remaining_balance", total_budget - total_spent)

        # Line items
        line_items = []
        for item in parsed.get("line_items", []):
            line_items.append({
                "category": item.get("category", "Miscellaneous"),
                "allocated": item.get("allocated", 0.0),
                "spent": item.get("spent", 0.0),
                "status": item.get("status", "on_track"),
            })

        # Alerts
        alerts = parsed.get("alerts", [])

        # Sponsor targets
        sponsor_targets = []
        for target in parsed.get("sponsor_targets", []):
            sponsor_targets.append({
                "id": target.get("id", f"sponsor_{uuid.uuid4().hex[:8]}"),
                "company_name": target.get("company_name", ""),
                "industry": target.get("industry", ""),
                "estimated_value": target.get("estimated_value", "$0"),
                "pitch_angle": target.get("pitch_angle", ""),
                "tier": target.get("tier", "silver"),
            })

        # Cost impact (if applicable)
        cost_impact = parsed.get("cost_impact", None)

        # Cascade tasks
        cascade_to = parsed.get("cascade_to", [])

        reasoning = parsed.get("reasoning", "Financial analysis completed by Fortuna.")

        # ---- Persist financial analysis to database ----
        from app.repository import insert_agent_log
        event = state_manager.get_event()
        event_id = event.get("id", "default") if event else "default"
        try:
            await insert_agent_log({
                "event_id": event_id,
                "agent": "fortuna",
                "action": "financial_analysis",
                "details": f"Budget: ${total_budget:,.0f}, Spent: ${total_spent:,.0f}, Remaining: ${remaining_balance:,.0f}, Sponsors: {len(sponsor_targets)}",
                "reasoning": reasoning,
            })
        except Exception as db_err:
            print(f"[Fortuna] DB log insert failed: {db_err}")

        # ---- Build approval items ----
        approval_items = []
        needs_approval = False

        # If sponsorship pitches are ready, request approval to send
        if sponsor_targets:
            needs_approval = True
            # Calculate total potential revenue
            total_potential = 0
            for s in sponsor_targets:
                val = s.get("estimated_value", "$0").replace("$", "").replace(",", "")
                try:
                    total_potential += float(val)
                except ValueError:
                    pass
            approval_items.append({
                "id": f"approval_fortuna_{uuid.uuid4().hex[:8]}",
                "agent": "fortuna",
                "action": "send_sponsor_pitch",
                "description": f"Send sponsorship pitches to {len(sponsor_targets)} potential sponsor(s)",
                "impact": f"Potential revenue: ${total_potential:,.0f}",
                "preview": {
                    "sponsors": [s["company_name"] for s in sponsor_targets[:3]],
                    "total_targets": len(sponsor_targets),
                },
            })

        return {
            "finance_output": {
                "total_budget": total_budget,
                "total_spent": total_spent,
                "remaining_balance": remaining_balance,
                "spending_velocity": parsed.get("spending_velocity", ""),
                "line_items": line_items,
                "alerts": alerts,
                "sponsor_targets": sponsor_targets,
                "cost_impact": cost_impact,
                "cascade_to": cascade_to,
                "requires_approval": needs_approval,
                "approval_items": approval_items,
                "reasoning": reasoning,
            },
        }

    except json.JSONDecodeError as e:
        return _build_error_response(
            f"Fortuna received a response from the LLM but couldn't parse it as JSON: {str(e)}",
            user_input, event_name,
        )

    except Exception as e:
        return _build_error_response(
            f"Fortuna encountered an error: {str(e)}",
            user_input, event_name,
        )


# ============================================================================
# ERROR FALLBACK — Returns structured finance output even on failure
# ============================================================================

def _build_error_response(error_msg: str, user_input: str, event_name: str) -> dict:
    """
    Build a graceful error response so the graph never crashes.
    Returns a finance_output with basic fallback budget data
    and the error in the reasoning field.
    """
    return {
        "finance_output": {
            "total_budget": 50000.0,
            "total_spent": 0.0,
            "remaining_balance": 50000.0,
            "spending_velocity": "N/A — using fallback data",
            "line_items": [
                {"category": "Venue", "allocated": 20000.0, "spent": 0.0, "status": "on_track"},
                {"category": "Marketing", "allocated": 5000.0, "spent": 0.0, "status": "on_track"},
                {"category": "Catering", "allocated": 15000.0, "spent": 0.0, "status": "on_track"},
                {"category": "Speakers", "allocated": 5000.0, "spent": 0.0, "status": "on_track"},
                {"category": "Technology", "allocated": 3000.0, "spent": 0.0, "status": "on_track"},
                {"category": "Miscellaneous", "allocated": 2000.0, "spent": 0.0, "status": "on_track"},
            ],
            "alerts": [],
            "sponsor_targets": [
                {
                    "id": f"sponsor_{uuid.uuid4().hex[:8]}",
                    "company_name": "TechGlobal Corp",
                    "industry": "Cloud Computing",
                    "estimated_value": "$10,000",
                    "pitch_angle": "Partnership opportunity for developer recruitment.",
                    "tier": "gold",
                },
            ],
            "cost_impact": None,
            "cascade_to": [],
            "requires_approval": False,
            "approval_items": [],
            "reasoning": (
                f"[FALLBACK] {error_msg}. "
                f"Fortuna generated default budget data for '{user_input[:80]}'. "
                "Please retry or check your API key configuration."
            ),
        },
    }
