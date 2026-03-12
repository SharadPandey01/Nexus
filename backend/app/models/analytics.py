# ============================================================================
# NEXUS BACKEND — Analytics Pydantic Models
# ============================================================================
# These models define the inputs and outputs for Athena (Analytics Agent).
# Athena looks at registration velocity, room capacities, and system health
# to provide warnings and insights.
# ============================================================================

from pydantic import BaseModel, Field
from typing import Optional, List


class InsightItem(BaseModel):
    """
    A single observation made by Athena.
    Displayed on the frontend dashboard.
    """
    type: str = Field(..., description="e.g., 'registration_trend', 'demographic', 'engagement_metric'")
    icon: str = Field("📊", description="Emoji to represent the insight visually")
    message: str = Field(..., description="The natural language observation")
    severity: str = Field("info", description="Impact level: 'info', 'warning', 'critical'")


class RiskItem(BaseModel):
    """
    A specific issue Athena has detected that requires attention.
    """
    risk: str = Field(..., description="Description of the potential problem")
    severity: str = Field("medium", description="Risk level: 'low', 'medium', 'high'")
    recommendation: str = Field("", description="Athena's suggestion on how to mitigate the risk")


class CapacityWarning(BaseModel):
    """
    A specific type of risk where popular sessions are assigned to
    rooms that are too small. Athena detects this and cascades a task
    to Chronos (Scheduler) to suggest a room swap.
    """
    session_title: str = Field(..., description="The overcrowded session")
    venue: str = Field(..., description="The assigned room")
    registrants: int = Field(..., description="Number of people who want to attend")
    capacity: int = Field(..., description="Max capacity of the room")
    recommendation: str = Field("", description="Suggested alternative room")


class AnalyticsResult(BaseModel):
    """
    The structured output payload returned by Athena.
    """
    insights: List[InsightItem] = Field(default_factory=list, description="General observations")
    risk_items: List[RiskItem] = Field(default_factory=list, description="Detected problems")
    capacity_warnings: List[CapacityWarning] = Field(default_factory=list, description="Specific room size issues")
    metrics: dict = Field(default_factory=dict, description="Key performance indicators (KPIs)")
    reasoning: str = Field("", description="The AI's explanation of how it derived the insights")
