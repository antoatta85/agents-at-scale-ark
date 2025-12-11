"""Event API handlers for event ingestion."""

from datetime import datetime, timezone
from typing import Any

from fastapi import Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from ark_sessions.core.database import get_session
from ark_sessions.core.config import logger
from ark_sessions.models import SessionEvent
from ark_sessions.storage.events import EventStorage


def ensure_utc_datetime(dt: datetime | None) -> datetime:
    """
    Ensure datetime is timezone-aware UTC.
    
    If a naive datetime is provided, it's assumed to be UTC and made timezone-aware.
    If a timezone-aware datetime is provided, it's converted to UTC.
    """
    if dt is None:
        return datetime.now(timezone.utc)
    if dt.tzinfo is None:
        # Naive datetime - assume it's UTC and make it timezone-aware
        return dt.replace(tzinfo=timezone.utc)
    # Timezone-aware - convert to UTC
    return dt.astimezone(timezone.utc)


class SessionEventCreate(BaseModel):
    """Request model for creating a session event."""
    
    sessionId: str = Field(..., min_length=1, description="Session ID")
    queryId: str | None = Field(None, description="Query ID (required for QueryStart/QueryComplete)")
    conversationId: str | None = Field(None, description="Conversation ID")
    reason: str = Field(..., min_length=1, description="Event reason (e.g., QueryStart, QueryComplete)")
    queryName: str | None = Field(None, description="Query name")
    queryNamespace: str | None = Field(None, description="Query namespace")
    durationMs: float | None = Field(None, ge=0, description="Duration in milliseconds (required for QueryComplete)")
    timestamp: datetime | None = Field(None, description="Event timestamp (UTC, defaults to now)")
    payload: dict[str, Any] = Field(default_factory=dict, description="Additional event data")
    
    @field_validator("reason")
    @classmethod
    def validate_reason(cls, v: str) -> str:
        """Validate event reason."""
        valid_reasons = {"QueryStart", "QueryComplete", "QueryError", "MessageAdded"}
        if v not in valid_reasons:
            # Log warning but don't reject - allow extensibility
            pass
        return v


class StatusResponse(BaseModel):
    """Standard status response."""
    status: str


async def create_event(
    event_data: SessionEventCreate,
    session: AsyncSession = Depends(get_session),
) -> StatusResponse:
    """
    Create a session event (event sourcing pattern).
    
    This endpoint accepts events that represent state changes in a session.
    Events are stored in an append-only log and used to derive current session state.
    """
    try:
        storage = EventStorage(session)
        
        # Ensure timestamp is timezone-aware UTC
        timestamp = ensure_utc_datetime(event_data.timestamp)
        
        # Validate query_id is provided for query-related events
        if event_data.reason in ("QueryStart", "QueryComplete") and not event_data.queryId:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"queryId is required for {event_data.reason} events"
            )
        
        # Create SessionEvent from request
        session_event = SessionEvent(
            session_id=event_data.sessionId,
            query_id=event_data.queryId,
            conversation_id=event_data.conversationId,
            reason=event_data.reason,
            query_name=event_data.queryName,
            query_namespace=event_data.queryNamespace,
            duration_ms=event_data.durationMs,
            timestamp=timestamp,
            payload=event_data.payload,
        )
        
        # Append event (implicitly creates session if needed)
        await storage.append_event(session_event)
        
        logger.debug(
            f"Created event: {event_data.reason} for session {event_data.sessionId}",
            extra={
                "session_id": event_data.sessionId,
                "query_id": event_data.queryId,
                "reason": event_data.reason,
            }
        )
        
        return StatusResponse(status="ok")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"Failed to create event: {str(e)}",
            exc_info=True,
            extra={
                "session_id": event_data.sessionId,
                "reason": event_data.reason,
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create event"
        )

