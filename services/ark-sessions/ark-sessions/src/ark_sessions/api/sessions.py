"""Session API handlers."""

from typing import Any

from fastapi import Depends, Path
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from ark_sessions.core.database import get_session
from ark_sessions.models import Message, SessionEvent
from ark_sessions.storage.events import EventStorage
from ark_sessions.storage.messages import MessageStorage
from ark_sessions.storage.sessions import SessionStorage


class Conversation(BaseModel):
    """Conversation model - derived from messages."""
    id: str
    firstMessage: dict[str, Any] | None = None
    lastMessage: dict[str, Any] | None = None


class Query(BaseModel):
    """Query model - derived from events, with nested conversations."""
    id: str
    name: str
    status: str  # "in_progress" or "completed"
    duration_ms: float | None = None
    conversations: list[Conversation] = []  # Conversations belonging to this query


class Session(BaseModel):
    """Session model - derived state from events (event sourcing pattern)."""
    id: str
    queries: list[Query]
    conversations: list[Conversation] = []  # Standalone conversations (no query_id)


class SessionsList(BaseModel):
    """List of sessions response."""
    sessions: list[str]


async def list_sessions(
    session: AsyncSession = Depends(get_session),
) -> SessionsList:
    """List all session IDs."""
    storage = SessionStorage(session)
    sessions = await storage.list_sessions()
    return SessionsList(sessions=sessions)


def _empty_session_response(session_id: str) -> Session:
    """Return empty session response per spec."""
    return Session(id=session_id, queries=[], conversations=[])


def _derive_queries_from_events(events: list[SessionEvent]) -> dict[str, Query]:
    """Derive queries from events (QueryStart/QueryComplete)."""
    queries = {}
    
    for event in events:
        if event.reason in ("QueryStart", "QueryComplete") and event.query_id:
            query_id = event.query_id
            if query_id not in queries:
                queries[query_id] = Query(
                    id=query_id,
                    name=event.query_name or "",
                    status="in_progress",
                    conversations=[],
                )
            
            if event.reason == "QueryComplete":
                # Create new Query instance instead of mutating (Pydantic v2 immutability)
                existing_query = queries[query_id]
                queries[query_id] = Query(
                    id=existing_query.id,
                    name=existing_query.name,
                    status="completed",
                    duration_ms=event.duration_ms if event.duration_ms is not None else existing_query.duration_ms,
                    conversations=existing_query.conversations,
                )
    
    return queries


def _derive_conversations_from_messages(messages: list[Message]) -> tuple[dict[str, Conversation], dict[str, Conversation]]:
    """
    Derive conversations from messages.
    Returns: (conversations_by_query_id, standalone_conversations)
    """
    conversations_by_query: dict[str, dict[str, Conversation]] = {}  # query_id -> {conv_id -> Conversation}
    standalone_conversations: dict[str, Conversation] = {}  # conv_id -> Conversation
    
    for msg in messages:
        conv_id = msg.conversation_id or "default"
        msg_data = msg.message_data
        
        if msg.query_id:
            # Conversation belongs to a query
            if msg.query_id not in conversations_by_query:
                conversations_by_query[msg.query_id] = {}
            
            if conv_id not in conversations_by_query[msg.query_id]:
                conversations_by_query[msg.query_id][conv_id] = Conversation(
                    id=conv_id,
                    firstMessage=None,
                    lastMessage=None,
                )
            
            # Create new Conversation instance instead of mutating (Pydantic v2 immutability)
            existing_conv = conversations_by_query[msg.query_id][conv_id]
            conversations_by_query[msg.query_id][conv_id] = Conversation(
                id=existing_conv.id,
                firstMessage=existing_conv.firstMessage if existing_conv.firstMessage else msg_data,
                lastMessage=msg_data,
            )
        else:
            # Standalone conversation (no query_id)
            if conv_id not in standalone_conversations:
                standalone_conversations[conv_id] = Conversation(
                    id=conv_id,
                    firstMessage=None,
                    lastMessage=None,
                )
            
            # Create new Conversation instance instead of mutating (Pydantic v2 immutability)
            existing_conv = standalone_conversations[conv_id]
            standalone_conversations[conv_id] = Conversation(
                id=existing_conv.id,
                firstMessage=existing_conv.firstMessage if existing_conv.firstMessage else msg_data,
                lastMessage=msg_data,
            )
    
    # Convert to flat dicts
    conversations_by_query_id = {
        query_id: list(convs.values())
        for query_id, convs in conversations_by_query.items()
    }
    standalone = list(standalone_conversations.values())
    
    return conversations_by_query_id, standalone


async def get_session_by_id(
    session_id: str = Path(..., description="Session ID"),
    session: AsyncSession = Depends(get_session),
) -> Session:
    """Get session with derived state (queries and conversations) per spec."""
    session_storage = SessionStorage(session)
    event_storage = EventStorage(session)
    message_storage = MessageStorage(session)
    
    session_obj = await session_storage.get_session(session_id)
    if not session_obj:
        return _empty_session_response(session_id)
    
    # Get events (event sourcing pattern)
    events = await event_storage.get_events_by_session(session_id)
    
    # Get messages for conversations
    messages = await message_storage.get_messages(session_id=session_id)
    
    # Derive queries from events
    queries_dict = _derive_queries_from_events(events)
    
    # Derive conversations from messages (grouped by query_id)
    conversations_by_query_id, standalone_conversations = _derive_conversations_from_messages(messages)
    
    # Attach conversations to their queries
    # Both conversations_by_query_id and queries_dict are keyed by query_id (Kubernetes UID)
    for query_id, query in queries_dict.items():
        if query_id in conversations_by_query_id:
            query.conversations = conversations_by_query_id[query_id]
    
    return Session(
        id=session_id,
        queries=list(queries_dict.values()),
        conversations=standalone_conversations,
    )
