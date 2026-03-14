# ============================================================================
# NEXUS BACKEND — CSV Parser Service
# ============================================================================
# Parses CSV and Excel files containing participant data.
#
# Handles common real-world issues:
# - Multiple column naming conventions (Name, name, full_name, etc.)
# - Encoding issues (common with Indian names)
# - Missing or malformed data
# - Duplicate detection
# - Email validation
#
# Usage:
#   from app.services.csv_parser import parse_participant_file
#   result = await parse_participant_file("path/to/file.csv")
# ============================================================================

import re
import pandas as pd
from typing import Dict, List, Any


# ============================================================================
# COLUMN NAME MAPPING
# ============================================================================
# People name their CSV columns differently. This mapping handles
# common variations so the parser works with any reasonable CSV.
# ============================================================================

COLUMN_MAPPINGS = {
    # Mapping: standard_field → list of possible column names (lowercase)
    "name": ["name", "full_name", "fullname", "full name", "participant_name", "participant name", "student_name", "student name"],
    "email": ["email", "email_address", "emailaddress", "email address", "e-mail", "mail"],
    "role": ["role", "type", "participant_type", "attendance_type", "category"],
    "track": ["track", "stream", "department", "dept", "branch"],
    "organization": ["organization", "company", "org", "school", "college", "university", "institution"],
    "phone": ["phone", "phone_number", "phonenumber", "mobile", "contact", "contact_number"],
}


def _normalize_column_name(col: str) -> str:
    """
    Normalize a column name to lowercase with underscores.
    Example: "Full Name" → "full_name", "E-Mail" → "e-mail"
    """
    return col.strip().lower().replace(" ", "_")


def _map_columns(df: pd.DataFrame) -> Dict[str, str]:
    """
    Map the DataFrame's actual column names to our standard field names.
    
    Args:
        df: The pandas DataFrame with original column names
    
    Returns:
        Dict mapping standard field names → actual column names in the CSV
        Example: {"name": "Full Name", "email": "E-mail Address"}
    """
    mapped = {}
    # Normalize all column names for comparison
    normalized = {_normalize_column_name(col): col for col in df.columns}

    for standard_field, possible_names in COLUMN_MAPPINGS.items():
        for possible in possible_names:
            if possible in normalized:
                mapped[standard_field] = normalized[possible]
                break

    return mapped


def _validate_email(email: str) -> bool:
    """
    Validate an email address using regex.
    
    This is a basic check — not exhaustive, but catches most issues.
    
    Args:
        email: The email address to validate
    
    Returns:
        True if the email looks valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
    # Basic email regex pattern
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email.strip()))


async def parse_participant_file(file_path: str) -> Dict[str, Any]:
    """
    Parse a CSV or Excel file containing participant data.
    
    This is the main function called by the upload route.
    
    Args:
        file_path: Path to the uploaded CSV/Excel file
    
    Returns:
        Dict with:
        - participants: List of cleaned participant dicts
        - total: Total rows in the file
        - valid: Number of valid participants
        - invalid: Number of invalid emails
        - invalid_details: List of invalid email entries
        - duplicates: Number of duplicate entries removed
    """
    # ---- Step 1: Read the file ----
    # Determine file type from extension
    if file_path.endswith(".csv"):
        # Try different encodings (common issue with Indian names)
        for encoding in ["utf-8", "latin-1", "cp1252"]:
            try:
                df = pd.read_csv(file_path, encoding=encoding)
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError("Could not decode the CSV file. Try saving it as UTF-8.")
    elif file_path.endswith((".xlsx", ".xls")):
        df = pd.read_excel(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_path}")

    # ---- Step 2: Map column names ----
    column_map = _map_columns(df)

    if "email" not in column_map:
        raise ValueError(
            "Could not find an email column in the file. "
            "Expected column names like: email, Email, email_address"
        )

    # ---- Step 3: Extract and clean participant data ----
    participants = []
    invalid_details = []
    seen_emails = set()  # For duplicate detection
    duplicates = 0

    for _, row in df.iterrows():
        # Extract fields using our column mapping
        participant = {}

        # Name (required-ish — use "Unknown" if missing)
        if "name" in column_map:
            participant["name"] = str(row.get(column_map["name"], "")).strip()
        else:
            participant["name"] = "Unknown"

        # Email (required)
        email_col = column_map["email"]
        email = str(row.get(email_col, "")).strip().lower()
        participant["email"] = email

        # Optional fields
        if "role" in column_map:
            participant["role"] = str(row.get(column_map["role"], "attendee")).strip().lower()
        else:
            participant["role"] = "attendee"

        if "track" in column_map:
            participant["track"] = str(row.get(column_map["track"], "")).strip()
        else:
            participant["track"] = ""

        if "organization" in column_map:
            participant["organization"] = str(row.get(column_map["organization"], "")).strip()
        else:
            participant["organization"] = ""

        if "phone" in column_map:
            participant["phone"] = str(row.get(column_map["phone"], "")).strip()
        else:
            participant["phone"] = ""

        # ---- Validate email ----
        is_valid = _validate_email(email)
        participant["is_valid_email"] = is_valid
        participant["status"] = "valid" if is_valid else "invalid"

        if not is_valid:
            invalid_details.append({
                "email": email,
                "name": participant["name"],
                "reason": "Invalid email format" if email else "Missing email",
            })

        # ---- Check for duplicates ----
        if email in seen_emails:
            duplicates += 1
            continue  # Skip duplicates
        seen_emails.add(email)

        participants.append(participant)

    # ---- Step 4: Return the parsed result ----
    valid_count = sum(1 for p in participants if p.get("is_valid_email", False))

    return {
        "participants": participants,
        "total": len(df),
        "valid": valid_count,
        "invalid": len(invalid_details),
        "invalid_details": invalid_details,
        "duplicates": duplicates,
        "columns_found": list(column_map.keys()),
        "columns_mapped": column_map,
    }
