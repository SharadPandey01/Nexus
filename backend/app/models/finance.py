# ============================================================================
# NEXUS BACKEND — Finance & Setup Models (Fortuna)
# ============================================================================

from pydantic import BaseModel, Field
from typing import List, Optional


class SponsorTarget(BaseModel):
    id: str
    company_name: str
    industry: str
    estimated_value: str
    pitch_angle: str


class BudgetLineItem(BaseModel):
    category: str
    allocated: float
    spent: float
    status: str = Field(pattern="^(on_track|over_budget|under_budget)$")


class FinanceResult(BaseModel):
    total_budget: float
    total_spent: float
    remaining_balance: float
    line_items: List[BudgetLineItem]
    sponsor_targets: List[SponsorTarget]
    reasoning: Optional[str] = None
    cascade_to: Optional[List[dict]] = None
    requires_approval: bool = False
    approval_items: Optional[List[dict]] = None
