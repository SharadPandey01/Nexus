# ============================================================================
# NEXUS BACKEND — Participant Segmentation Service
# ============================================================================
# Used by Hermes (Mail Agent) to divide large lists of participants
# into smaller, targeted cohorts for personalized messaging.
# ============================================================================

from typing import List, Dict, Any


def segment_by_field(participants: List[Dict], field: str) -> Dict[str, List[Dict]]:
    """
    Group participants by an exact field value.
    
    For example, segmenting by "role" will return a dictionary dividing
    the list into attendees, speakers, and volunteers.
    
    Args:
        participants: List of participant dictionary objects
        field: The key to group by (e.g., 'role', 'track', 'organization')
        
    Returns:
        Dictionary mapping field values to the list of participants holding that value
    """
    segments = {}
    for p in participants:
        # Extract the value, falling back to 'unknown' if missing
        value = str(p.get(field, "unknown")).strip().lower() or "unknown"
        if value not in segments:
            segments[value] = []
        segments[value].append(p)
    return segments


def segment_by_criteria(participants: List[Dict], criteria: str) -> List[Dict]:
    """
    Filter a participant list using a natural language keyword heuristic.
    This allows LLM agents to request segments without writing SQL.
    
    For the hackathon demo, we support basic keyword matching.
    
    Args:
        participants: List of participant dictionaries
        criteria: Natural language string from the LLM (e.g., "Find all speakers")
        
    Returns:
        Filtered list of participants who match the criteria
    """
    criteria_lower = criteria.lower()

    # Heuristic 1: Role-based filtering
    roles = ["speaker", "attendee", "volunteer", "organizer"]
    for role in roles:
        if role in criteria_lower:
            return [p for p in participants if p.get("role", "").lower() == role]

    # Heuristic 2: Track/Session specific filtering
    if "track" in criteria_lower:
        # e.g., "AI track" -> we look for "ai"
        track_name = criteria_lower.replace("track", "").strip()
        return [p for p in participants if track_name in p.get("track", "").lower()]

    # Heuristic 3: Validity filtering (useful for handling bad data)
    if "invalid" in criteria_lower:
        return [p for p in participants if not p.get("is_valid_email", True)]
    if "valid" in criteria_lower:
        return [p for p in participants if p.get("is_valid_email", True)]

    # Default fallback: if we don't understand the criteria, return everyone
    return participants


def create_segment_summary(segments: Dict[str, List[Dict]]) -> List[Dict]:
    """
    Convert a complex segment mapping into a lightweight summary.
    This summary is meant to be sent back to the frontend UI so the
    organizer can see *how* Hermes divided the list.
    
    Args:
        segments: Dictionary output from segment_by_field
        
    Returns:
        List of lightweight dictionaries with name, count, and criteria
    """
    return [
        {"name": name, "count": len(members), "criteria": f"field={name}"}
        for name, members in segments.items()
    ]
