"""Tests for event storage operations."""

import unittest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from ark_sessions.models import SessionEvent
from ark_sessions.storage.events import EventStorage


class TestEventStorage(unittest.IsolatedAsyncioTestCase):
    """Test event storage functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_session = AsyncMock(spec=AsyncSession)
        self.storage = EventStorage(self.mock_session)
    
    @patch('ark_sessions.storage.events.SessionStorage')
    async def test_append_event(self, mock_session_storage_class):
        """Test appending an event."""
        # Setup
        mock_session_storage = AsyncMock()
        mock_session_storage.create_session = AsyncMock()
        mock_session_storage_class.return_value = mock_session_storage
        
        event = SessionEvent(
            session_id="test-session-123",
            query_id="test-query-456",
            reason="QueryStart",
            timestamp=datetime.utcnow(),
        )
        
        self.mock_session.commit = AsyncMock()
        
        # Execute
        await self.storage.append_event(event)
        
        # Verify
        self.mock_session.add.assert_called_once_with(event)
        self.mock_session.commit.assert_called_once()
        mock_session_storage.create_session.assert_called_once_with("test-session-123")
    
    async def test_get_events_by_session(self):
        """Test getting events by session ID."""
        # Setup
        session_id = "test-session-123"
        events = [
            SessionEvent(
                id=1,
                session_id=session_id,
                query_id="query-1",
                reason="QueryStart",
                timestamp=datetime(2024, 1, 1, 10, 0, 0),
            ),
            SessionEvent(
                id=2,
                session_id=session_id,
                query_id="query-1",
                reason="QueryComplete",
                timestamp=datetime(2024, 1, 1, 10, 5, 0),
            ),
        ]
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = events
        self.mock_session.execute.return_value = mock_result
        
        # Execute
        result = await self.storage.get_events_by_session(session_id)
        
        # Verify
        self.assertEqual(len(result), 2)
        self.assertEqual(result, events)
    
    async def test_get_events_by_query(self):
        """Test getting events by query ID."""
        # Setup
        query_id = "test-query-456"
        events = [
            SessionEvent(
                id=1,
                session_id="session-1",
                query_id=query_id,
                reason="QueryStart",
                timestamp=datetime(2024, 1, 1, 10, 0, 0),
            ),
        ]
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = events
        self.mock_session.execute.return_value = mock_result
        
        # Execute
        result = await self.storage.get_events_by_query(query_id)
        
        # Verify
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].query_id, query_id)


if __name__ == '__main__':
    unittest.main()

