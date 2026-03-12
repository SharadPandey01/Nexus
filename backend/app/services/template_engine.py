# ============================================================================
# NEXUS BACKEND — Template Engine Service
# ============================================================================
# A core service used by Apollo (Content Agent) and Hermes (Mail Agent)
# to take generalized Markdown/Text templates and inject personal participant
# data. Uses {{placeholder}} syntax.
# ============================================================================

import re
from typing import Dict, List, Any


def personalize_template(template: str, participant: Dict[str, Any]) -> str:
    """
    Replace all {{placeholders}} inside a text template with the exact
    data values belonging to the given participant.
    
    This function handles variations in syntax (e.g. {{first_name}} vs 
    {{First Name}}) seamlessly.
    
    Args:
        template: Raw string with {{handlebars_style_markers}}
        participant: Dictionary of user data
        
    Returns:
        Fully rendered text string
    """
    # Create a flat lookup dictionary, normalizing keys to handle casing variations
    lookup = {}
    for key, value in participant.items():
        lookup[key.lower()] = str(value) if value else ""
        # Create a variant with spaces (e.g., 'first_name' -> 'first name')
        lookup[key.lower().replace("_", " ")] = str(value) if value else ""

    # Convenience feature: Many participant CSVs only have a "name" column.
    # We automatically split that into `first_name` and `last_name` placeholders.
    full_name = participant.get("name", "")
    if full_name:
        parts = full_name.strip().split()
        lookup["first_name"] = parts[0] if parts else ""
        lookup["first name"] = parts[0] if parts else ""
        lookup["last_name"] = parts[-1] if len(parts) > 1 else ""
        lookup["last name"] = parts[-1] if len(parts) > 1 else ""

    # Regex function to match {{pattern}} and replace from lookup
    def replace_match(match):
        key = match.group(1).strip().lower()
        # Fallback to the original marker if data is missing, to alert the human reviewer
        return lookup.get(key, f"[{match.group(1).strip()}]")

    # Execute the replacement across the template
    return re.sub(r'\{\{(.+?)\}\}', replace_match, template)


def personalize_batch(
    template: str,
    participants: List[Dict[str, Any]],
    preview_count: int = 3,
) -> Dict[str, Any]:
    """
    Process a list of participants against a single template.
    Instead of returning thousands of rendered emails, it processes them
    and returns a summary object alongside a handful of previews.
    
    This feeds directly into the Human-in-the-Loop "Approval Card" UI.
    
    Args:
        template: Raw text template
        participants: List of all targeted attendees
        preview_count: How many rendered previews to include in the payload
        
    Returns:
        Summary dict containing totals, truncated template, and the previews
    """
    previews = []
    
    # Process attendees up to the preview limit
    for i, p in enumerate(participants):
        personalized = personalize_template(template, p)
        if i < preview_count:
            previews.append({
                "to": p.get("email", ""),
                "name": p.get("name", ""),
                "body": personalized,
            })

    return {
        "total": len(participants),
        "previews": previews,
        "template_used": template[:100] + "..." if len(template) > 100 else template,
    }
