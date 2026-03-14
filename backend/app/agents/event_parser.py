# ============================================================================
# NEXUS BACKEND — Event Parser (LLM-powered)
# ============================================================================
# Extracts structured event details from a natural language prompt.
#
# Input:  "Organize a 3-day AI hackathon called NexusHack in Bangalore
#          starting March 20th for 500 participants"
#
# Output: { name: "NexusHack", location: "Bangalore",
#           start_date: "2026-03-20", expected_attendees: 500, ... }
#
# Usage:
#   from app.agents.event_parser import parse_event_from_prompt
#   parsed = await parse_event_from_prompt("Organize a hackathon...")
# ============================================================================

import json
from datetime import datetime
from typing import Optional, Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import settings


EVENT_PARSER_SYSTEM_PROMPT = """You are an event detail extractor. Your job is to parse a natural language event description and extract structured event details.

## Rules
1. Extract ONLY what is explicitly stated or strongly implied in the prompt
2. NEVER hallucinate or invent details that aren't in the prompt
3. For missing fields, return null
4. Always generate a clean, professional event name — even if the user didn't give one explicitly, infer a reasonable name from context (e.g., "AI Workshop" from "organize workshops on AI")
5. Always generate a clear description summarizing the user's intent
6. For relative dates (e.g., "next week", "in 2 days"), compute the actual ISO date using today's date provided below
7. If only a start date is mentioned and duration is given (e.g., "3-day"), compute the end date

## CRITICAL: Output Format
Respond with ONLY a valid JSON object. No markdown, no explanation outside JSON.

{
  "name": "Event Name",
  "description": "A clear, professional 1-2 sentence description of the event",
  "event_type": "hackathon" | "conference" | "workshop" | "meetup" | "seminar" | "summit" | "webinar" | "festival" | "other",
  "start_date": "YYYY-MM-DD" or null,
  "end_date": "YYYY-MM-DD" or null,
  "location": "City or Venue" or null,
  "organizer_name": "Organizer name" or null,
  "expected_attendees": 500 or null,
  "themes": ["AI", "Machine Learning"] or [],
  "key_activities": ["workshops", "keynotes", "networking"] or [],
  "venues": [{"name": "Auditorium A", "capacity": 500}, {"name": "Lab B", "capacity": 60}] or null
}
"""


async def parse_event_from_prompt(prompt: str) -> Dict[str, Any]:
    """
    Use an LLM to extract structured event details from a natural language prompt.

    Args:
        prompt: The user's raw natural language event description

    Returns:
        Dict with extracted event fields (missing fields are null)
    """
    today = datetime.now().strftime("%Y-%m-%d")

    user_message = f"""Today's date is {today}. Extract event details from this prompt:

"{prompt}"

Respond with ONLY the JSON object."""

    try:
        llm = ChatGoogleGenerativeAI(
            model=settings.LLM_MODEL,
            google_api_key=settings.GEMINI_API_KEY,
            temperature=0.1,  # Very low — we want deterministic extraction
        )

        response = await llm.ainvoke([
            {"role": "system", "content": EVENT_PARSER_SYSTEM_PROMPT},
            {"role": "human", "content": user_message},
        ])

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

        # Ensure we always have at least a name
        if not parsed.get("name"):
            raise ValueError("LLM failed to extract a valid event name from the prompt.")

        if not parsed.get("description"):
            parsed["description"] = prompt.strip()

        return parsed

    except (json.JSONDecodeError, Exception) as e:
        # If LLM fails, raise ValueError to be caught by the router
        print(f"[EventParser] LLM parsing failed: {e}")
        raise ValueError(str(e))
