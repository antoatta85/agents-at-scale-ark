from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class A2ATaskResponse(BaseModel):
    name: str
    namespace: str
    queryName: Optional[str] = None
    status: Optional[dict] = None
    creationTimestamp: Optional[datetime] = None


class A2ATaskListResponse(BaseModel):
    items: list[A2ATaskResponse]
    count: int


class A2ATaskCreateRequest(BaseModel):
    name: str
    queryName: str
    a2aServerRef: Optional[dict] = None
    agentRef: Optional[dict] = None
    queryRef: Optional[dict] = None


class A2ATaskDetailResponse(BaseModel):
    name: str
    namespace: str
    queryName: Optional[str] = None
    a2aServerRef: Optional[dict] = None
    agentRef: Optional[dict] = None
    queryRef: Optional[dict] = None
    metadata: Optional[dict] = None
    status: Optional[dict] = None
