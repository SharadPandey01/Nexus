# ============================================================================
# NEXUS BACKEND — Database Setup (SQLite)
# ============================================================================
# Manages the SQLite database connection using aiosqlite (async).
#
# Why SQLite for a hackathon:
# - Zero configuration (no Docker, no DB server, no connection strings)
# - Ships as a single file in data/nexus.db
# - Good enough for demo-scale data (hundreds of records)
# - Can swap to PostgreSQL later if needed
#
# Usage:
#   from app.database import get_db, init_db, close_db
# ============================================================================

import os
import aiosqlite
from app.config import settings


# ============================================================================
# DATABASE CONNECTION
# ============================================================================
# We keep a reference to the database connection so we can reuse it
# across the application lifetime (opened on startup, closed on shutdown).
# ============================================================================

# Global database connection (initialized on startup)
_db_connection: aiosqlite.Connection | None = None


async def get_db() -> aiosqlite.Connection:
    """
    Get the current database connection.
    
    This is used by repository functions to execute queries.
    The connection is created once during startup and reused.
    
    Returns:
        aiosqlite.Connection: The active database connection
        
    Raises:
        RuntimeError: If the database hasn't been initialized yet
    """
    global _db_connection
    if _db_connection is None:
        raise RuntimeError(
            "Database not initialized! Make sure init_db() was called during startup."
        )
    return _db_connection


async def init_db():
    """
    Initialize the database connection and create all tables.
    
    Called once during server startup (in main.py lifespan).
    Creates the SQLite database file if it doesn't exist.
    """
    global _db_connection

    # Ensure the data/ directory exists
    db_path = settings.db_path
    os.makedirs(os.path.dirname(db_path) if os.path.dirname(db_path) else ".", exist_ok=True)

    # Open the database connection
    _db_connection = await aiosqlite.connect(db_path)
    # Enable WAL mode for better concurrent read performance
    await _db_connection.execute("PRAGMA journal_mode=WAL")
    # Return rows as dictionaries (access by column name instead of index)
    _db_connection.row_factory = aiosqlite.Row

    # Create all tables
    await _create_tables()


async def _create_tables():
    """
    Create all database tables if they don't exist.
    
    Each table maps to a core concept in the Nexus system:
    - events: The event being organized
    - participants: People registered for the event
    - sessions: Individual sessions/talks/workshops in the schedule
    - content_queue: Generated content awaiting approval
    - approvals: Pending approval items from agents
    - agent_logs: Complete log of all agent actions
    """
    db = await get_db()

    # ---- EVENTS TABLE ----
    # Stores the main event configuration (one event per demo)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,                -- UUID for the event
            name TEXT NOT NULL,                 -- Event name (e.g., "TechFest 2026")
            description TEXT,                   -- Event description
            start_date TEXT,                    -- ISO 8601 date string
            end_date TEXT,                      -- ISO 8601 date string
            location TEXT,                      -- Venue/city
            organizer_name TEXT,                -- Who's organizing
            status TEXT DEFAULT 'draft',        -- draft, active, completed
            config_json TEXT DEFAULT '{}',      -- Additional config as JSON
            created_at TEXT NOT NULL,           -- ISO 8601 timestamp
            updated_at TEXT NOT NULL            -- ISO 8601 timestamp
        )
    """)

    # ---- PARTICIPANTS TABLE ----
    # Stores people registered for the event (from CSV upload)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS participants (
            id TEXT PRIMARY KEY,                -- UUID
            event_id TEXT NOT NULL,             -- Which event they belong to
            name TEXT NOT NULL,                 -- Full name
            email TEXT NOT NULL,                -- Email address
            role TEXT DEFAULT 'attendee',       -- attendee, speaker, volunteer, organizer
            track TEXT,                         -- Which track they're in
            organization TEXT,                  -- Company/school name
            phone TEXT,                         -- Phone number (optional)
            metadata_json TEXT DEFAULT '{}',    -- Any extra CSV columns as JSON
            is_valid_email INTEGER DEFAULT 1,   -- 1 = valid, 0 = invalid email
            created_at TEXT NOT NULL,           -- When the record was created
            FOREIGN KEY (event_id) REFERENCES events(id)
        )
    """)

    # ---- SESSIONS TABLE ----
    # Stores scheduled sessions (talks, workshops, breaks)
    await db.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,                -- UUID
            event_id TEXT NOT NULL,             -- Which event this session belongs to
            title TEXT NOT NULL,                -- Session title
            description TEXT,                   -- Session description
            session_type TEXT DEFAULT 'talk',   -- talk, workshop, break, keynote, panel
            speaker TEXT,                       -- Speaker name
            venue TEXT,                         -- Room/venue name
            start_time TEXT,                    -- ISO 8601 datetime
            end_time TEXT,                      -- ISO 8601 datetime
            day INTEGER,                        -- Day number (1, 2, 3...)
            capacity INTEGER,                   -- Max attendees
            is_fixed INTEGER DEFAULT 0,         -- 1 = immovable (opening ceremony etc.)
            status TEXT DEFAULT 'scheduled',    -- scheduled, moved, cancelled
            metadata_json TEXT DEFAULT '{}',    -- Extra data as JSON
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (event_id) REFERENCES events(id)
        )
    """)

    # ---- CONTENT QUEUE TABLE ----
    # Stores generated content (social posts, emails) awaiting approval
    await db.execute("""
        CREATE TABLE IF NOT EXISTS content_queue (
            id TEXT PRIMARY KEY,                -- UUID
            event_id TEXT NOT NULL,             -- Which event
            content_type TEXT NOT NULL,         -- social_post, email_draft, campaign
            platform TEXT,                      -- twitter, linkedin, instagram, email
            title TEXT,                         -- Content title/subject
            body TEXT NOT NULL,                 -- The actual content text
            tone TEXT,                          -- professional, casual, hype
            hashtags TEXT,                      -- Comma-separated hashtags
            scheduled_time TEXT,                -- When to publish (ISO 8601)
            status TEXT DEFAULT 'draft',        -- draft, approved, published, rejected
            agent_reasoning TEXT,               -- Why the agent created this content
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (event_id) REFERENCES events(id)
        )
    """)

    # ---- APPROVALS TABLE ----
    # Stores pending items that need organizer approval
    await db.execute("""
        CREATE TABLE IF NOT EXISTS approvals (
            id TEXT PRIMARY KEY,                -- UUID
            event_id TEXT NOT NULL,             -- Which event
            agent TEXT NOT NULL,                -- Which agent is requesting (chronos, hermes, apollo, athena)
            action TEXT NOT NULL,               -- What the agent wants to do
            description TEXT NOT NULL,           -- Human-readable explanation
            impact TEXT,                        -- "Will affect 87 participants"
            preview_json TEXT DEFAULT '{}',     -- Preview of the action as JSON
            status TEXT DEFAULT 'pending',      -- pending, approved, rejected, edited
            organizer_notes TEXT,               -- Notes from the organizer
            created_at TEXT NOT NULL,
            resolved_at TEXT,                   -- When the organizer decided
            FOREIGN KEY (event_id) REFERENCES events(id)
        )
    """)

    # ---- AGENT LOGS TABLE ----
    # Complete audit trail of all agent actions
    await db.execute("""
        CREATE TABLE IF NOT EXISTS agent_logs (
            id TEXT PRIMARY KEY,                -- UUID
            event_id TEXT,                      -- Which event (nullable for system logs)
            agent TEXT NOT NULL,                -- Which agent (chronos, hermes, apollo, athena, system)
            action TEXT NOT NULL,               -- What happened
            details TEXT,                       -- Detailed description
            reasoning TEXT,                     -- Agent's reasoning chain
            from_agent TEXT,                    -- For inter-agent messages: who sent it
            to_agent TEXT,                      -- For inter-agent messages: who received it
            trace_id TEXT,                      -- Groups related actions together
            log_level TEXT DEFAULT 'info',      -- info, warning, error
            created_at TEXT NOT NULL            -- When this happened
        )
    """)

    # Commit the table creation
    await db.commit()
    print("📋 All database tables created/verified")


async def close_db():
    """
    Close the database connection.
    
    Called during server shutdown (in main.py lifespan).
    """
    global _db_connection
    if _db_connection:
        await _db_connection.close()
        _db_connection = None
