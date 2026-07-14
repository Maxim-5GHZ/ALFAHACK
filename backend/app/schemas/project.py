from datetime import datetime

from pydantic import BaseModel

from app.schemas.business_plan import BusinessPlanResponse


class ProjectCreate(BaseModel):
    pass


class ProjectResponse(BaseModel):
    id: int
    title: str
    industry: str | None
    created_at: datetime
    business_plan: BusinessPlanResponse | None = None

    model_config = {"from_attributes": True}
