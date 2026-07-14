from pydantic import BaseModel


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
    alfa_products: list[str]
    competitors_count: int | None = 0

    model_config = {"from_attributes": True}
