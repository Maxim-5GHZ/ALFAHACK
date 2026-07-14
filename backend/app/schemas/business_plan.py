from pydantic import BaseModel


class BusinessPlanRequest(BaseModel):
    niche: str | None = None
    budget: float | None = None
    city: str | None = None
    experience: str | None = None


class ExpenseItem(BaseModel):
    name: str
    amount: float


class BusinessPlanResponse(BaseModel):
    niche: str
    summary: str
    monthly_revenue: float
    monthly_expenses: float
    payback_months: int
    expenses: list[ExpenseItem]
    action_plan: list[str]
