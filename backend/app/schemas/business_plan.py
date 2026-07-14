from pydantic import BaseModel, Field


class ExpenseItem(BaseModel):
    name: str
    amount: float


class BusinessPlanResponse(BaseModel):
    niche: str
    summary: str
    monthly_revenue: float
    monthly_expenses: float
    payback_months: int
    expenses: list[ExpenseItem] = Field(validation_alias="expenses_json")
    action_plan: list[str] = Field(validation_alias="action_plan_json")
    alfa_products: list[str] = Field(validation_alias="alfa_products_json")
    completed_steps_json: list[str] = []
    competitors_count: int | None = 0

    model_config = {"from_attributes": True, "populate_by_name": True}
