from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    pass


class ProjectResponse(BaseModel):
    id: int
    title: str
    industry: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
