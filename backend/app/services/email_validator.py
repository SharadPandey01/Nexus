# ============================================================================
# NEXUS BACKEND — Email Validation Service
# ============================================================================
# Utility functions used by Hermes (Mail Agent) and the CSV Parser
# to ensure email addresses are syntactically valid and free of duplicates.
# ============================================================================

import re
from typing import List, Tuple


def validate_email(email: str) -> bool:
    """
    Check if an email address has a valid format using regex.
    This is a basic syntax check (e.g., handles format like user@domain.com),
    but does not check MX records or ping the actual server.
    
    Args:
        email: The string to validate
    
    Returns:
        True if valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
    # Standard email validation regex
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))


def validate_email_batch(emails: List[str]) -> Tuple[List[str], List[dict]]:
    """
    Validate a large batch of emails simultaneously.
    
    Args:
        emails: List of raw email strings from CSV or input
        
    Returns:
        A tuple containing:
        1. A list of valid, normalized email strings
        2. A list of dicts detailing the invalid emails and reasons why
    """
    valid = []
    invalid = []

    for email in emails:
        # Normalize to lowercase and strip whitespace
        email = email.strip().lower()
        if validate_email(email):
            valid.append(email)
        else:
            reason = "Missing email" if not email else "Invalid format"
            invalid.append({"email": email, "reason": reason})

    return valid, invalid


def find_duplicates(emails: List[str]) -> Tuple[List[str], List[str]]:
    """
    Scan a list of emails to separate out unique addresses from duplicates.
    Critical for preventing attendees from receiving the same mail twice.
    
    Args:
        emails: A list of email strings
        
    Returns:
        A tuple containing:
        1. A list of unique emails (first occurrences)
        2. A list of duplicate emails found
    """
    seen = set()
    unique = []
    dupes = []

    for email in emails:
        # Normalizing ensures "User@Example.com" and "user@example.com" are caught
        email_lower = email.strip().lower()
        if email_lower in seen:
            dupes.append(email_lower)
        else:
            seen.add(email_lower)
            unique.append(email_lower)

    return unique, dupes
