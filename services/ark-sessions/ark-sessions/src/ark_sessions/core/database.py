"""Database connection and session management."""

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlmodel import SQLModel

from ark_sessions.core.config import settings
from ark_sessions.models import Message, Session, Span, SpanEvent, Trace  # noqa: F401 - Import to register models

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

TRIGGER_SQL = ["""
CREATE OR REPLACE FUNCTION notify_session_event()
RETURNS TRIGGER AS $$
DECLARE
    channel_name TEXT;
    payload JSON;
BEGIN
    channel_name := 'ark_sessions_' || NEW.session_id;

    payload := json_build_object(
        'id', NEW.id,
        'session_id', NEW.session_id,
        'query_id', NEW.query_id,
        'conversation_id', NEW.conversation_id,
        'reason', NEW.reason,
        'query_name', NEW.query_name,
        'query_namespace', NEW.query_namespace,
        'duration_ms', NEW.duration_ms,
        'timestamp', to_char(NEW.timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'payload', NEW.payload,
        'created_at', to_char(NEW.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    );

    PERFORM pg_notify(channel_name, payload::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
""",
"DROP TRIGGER IF EXISTS session_events_notify ON session_events;",
"""
CREATE TRIGGER session_events_notify
    AFTER INSERT ON session_events
    FOR EACH ROW
    EXECUTE FUNCTION notify_session_event();
"""]


async def init_db() -> None:
    """Initialize database - create all tables and triggers."""
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        for sql_statement in TRIGGER_SQL:
            await conn.execute(text(sql_statement))


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """Get async database session (dependency)."""
    async with AsyncSession(engine) as session:
        yield session

