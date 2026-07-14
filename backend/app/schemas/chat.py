from datetime import datetime

from pydantic import BaseModel


class ChatMessageCreate(BaseModel):
    text: str
    thread_id: str = "workspace"


class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    thread_id: str
    created_at: datetime

    model_config = {"from_attributes": True}
