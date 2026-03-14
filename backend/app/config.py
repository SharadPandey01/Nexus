# ============================================================================
# NEXUS BACKEND — Configuration
# ============================================================================
# Loads all settings from the .env file using Pydantic Settings.
# This is the SINGLE SOURCE OF TRUTH for all configuration values.
#
# Usage anywhere in the app:
#   from app.config import settings
#   print(settings.GEMINI_API_KEY)
# ============================================================================

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables / .env file.
    
    Pydantic Settings automatically:
    - Reads from .env file
    - Validates types (str, int, bool, etc.)
    - Provides defaults where specified
    - Raises clear errors if required vars are missing
    """

    # ---- LLM API Keys ----
    # Primary: Google Gemini (free tier, fast, good structured output)
    GEMINI_API_KEY: str = ""
    # Fallback: OpenAI (if Gemini rate-limits during demo)
    OPENAI_API_KEY: str = ""

    # ---- LLM Configuration ----
    # Default model for all agent LLM calls
    LLM_MODEL: str = "gemini-2.0-flash"
    # Temperature: 0.0 = deterministic, 1.0 = creative
    LLM_TEMPERATURE: float = 0.3

    # ---- Database ----
    # SQLite database file path
    DATABASE_URL: str = "sqlite:///./data/nexus.db"

    # ---- Server ----
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    # Debug mode enables auto-reload and verbose error messages
    DEBUG: bool = True

    # ---- CORS ----
    # Allowed frontend origins (comma-separated in .env, parsed as list)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ---- Email / SMTP ----
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "nexus@event.local"
    # When False, emails are logged but not actually sent (demo mode)
    EMAIL_REAL_SEND: bool = False

    @property
    def cors_origins_list(self) -> List[str]:
        """
        Parse the comma-separated CORS_ORIGINS string into a list.
        Example: "http://localhost:5173,http://localhost:3000"
                → ["http://localhost:5173", "http://localhost:3000"]
        """
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def db_path(self) -> str:
        """
        Extract just the file path from the DATABASE_URL.
        Example: "sqlite:///./data/nexus.db" → "./data/nexus.db"
        """
        return self.DATABASE_URL.replace("sqlite:///", "")

    class Config:
        # Tell Pydantic Settings to load from this .env file
        # Check both current directory and parent directory
        env_file = (".env", "../.env")
        # If .env doesn't exist, don't crash — just use defaults
        env_file_encoding = "utf-8"
        # Allow extra fields in .env without raising errors
        extra = "ignore"


# ============================================================================
# GLOBAL SETTINGS INSTANCE
# ============================================================================
# Import this anywhere: from app.config import settings
# It's created once and reused across the entire application.
# ============================================================================
settings = Settings()
