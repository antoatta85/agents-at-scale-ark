"""Message API handlers."""

from typing import Any

from fastapi import Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ark_sessions.core.database import get_session
from ark_sessions.models import Message
from ark_sessions.storage.messages import MessageStorage


class AddMessageRequest(BaseModel):
    """Request model for adding messages."""
    
    session_id: str
    query_id: str | None = None
    messages: list[dict[str, Any]]


class StatusResponse(BaseModel):
    """Standard status response."""
    status: str


class MessageRecord(BaseModel):
    """Message record matching Go MessageRecord structure."""
    id: int
    session_id: str
    query_id: str | None
    message: dict[str, Any]  # JSON-encoded message data
    created_at: str  # ISO format timestamp


async def add_messages(
    request: AddMessageRequest,
    session: AsyncSession = Depends(get_session),
) -> StatusResponse:
    """Add messages to a session."""
    storage = MessageStorage(session)
    await storage.add_messages(
        session_id=request.session_id,
        messages=request.messages,
        query_id=request.query_id,
    )
    return StatusResponse(status="ok")


async def get_messages(
    session_id: str | None = Query(None, description="Filter by session ID"),
    query_id: str | None = Query(None, description="Filter by query ID"),
    session: AsyncSession = Depends(get_session),
) -> list[MessageRecord]:
    """Get messages, optionally filtered by session_id or query_id."""
    storage = MessageStorage(session)
    messages = await storage.get_messages(session_id=session_id, query_id=query_id)
    
    # Convert Message models to MessageRecord format expected by Go client
    message_records = []
    for msg in messages:
        message_records.append(MessageRecord(
            id=msg.id or 0,
            session_id=msg.session_id,
            query_id=msg.query_id,
            message=msg.message_data,  # Already a dict
            created_at=msg.created_at.isoformat() if msg.created_at else "",
        ))
    
    return message_records

