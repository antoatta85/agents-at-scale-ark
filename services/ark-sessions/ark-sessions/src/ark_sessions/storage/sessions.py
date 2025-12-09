"""Session storage operations."""

from datetime import datetime

from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from ark_sessions.models import Session


class SessionStorage:
    """Storage for session operations."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_session(self, session_id: str) -> Session:
        """Create a new session if it doesn't exist."""
        # Try to get existing session
        statement = select(Session).where(Session.id == session_id)
        result = await self.session.execute(statement)
        existing = result.scalar_one_or_none()
        
        if existing:
            # Update updated_at
            existing.updated_at = datetime.utcnow()
            await self.session.commit()
            await self.session.refresh(existing)
            return existing
        
        # Create new session
        session = Session(id=session_id)
        self.session.add(session)
        await self.session.commit()
        await self.session.refresh(session)
        return session
    
    async def get_session(self, session_id: str) -> Session | None:
        """Get session by ID."""
        statement = select(Session).where(Session.id == session_id)
        result = await self.session.execute(statement)
        return result.scalar_one_or_none()
    
    async def list_sessions(self) -> list[str]:
        """List all session IDs."""
        statement = select(Session.id)
        result = await self.session.execute(statement)
        return list(result.scalars().all())

