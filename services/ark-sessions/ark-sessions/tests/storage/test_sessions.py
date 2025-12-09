"""Tests for session storage operations."""

import unittest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from ark_sessions.models import Session
from ark_sessions.storage.sessions import SessionStorage


class TestSessionStorage(unittest.TestCase):
    """Test session storage functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_session = AsyncMock(spec=AsyncSession)
        self.storage = SessionStorage(self.mock_session)
    
    @patch('ark_sessions.storage.sessions.datetime')
    async def test_create_session_new(self, mock_datetime):
        """Test creating a new session."""
        # Setup
        mock_datetime.utcnow.return_value = datetime(2024, 1, 1, 12, 0, 0)
        session_id = "test-session-123"
        
        # Mock database query - session doesn't exist
        mock_result = Mock()
        mock_result.scalars.return_value.first.return_value = None
        self.mock_session.execute.return_value = mock_result
        
        # Mock commit and refresh
        self.mock_session.commit = AsyncMock()
        self.mock_session.refresh = AsyncMock()
        
        # Execute
        result = await self.storage.create_session(session_id)
        
        # Verify
        self.assertIsNotNone(result)
        self.assertEqual(result.id, session_id)
        self.mock_session.add.assert_called_once()
        self.mock_session.commit.assert_called_once()
        self.mock_session.refresh.assert_called_once()
    
    async def test_create_session_existing(self):
        """Test creating a session that already exists."""
        # Setup
        session_id = "existing-session-123"
        existing_session = Session(id=session_id, created_at=datetime(2024, 1, 1, 10, 0, 0))
        
        # Mock database query - session exists
        mock_result = Mock()
        mock_result.scalars.return_value.first.return_value = existing_session
        self.mock_session.execute.return_value = mock_result
        
        # Mock commit and refresh
        self.mock_session.commit = AsyncMock()
        self.mock_session.refresh = AsyncMock()
        
        # Execute
        result = await self.storage.create_session(session_id)
        
        # Verify
        self.assertEqual(result, existing_session)
        self.mock_session.add.assert_not_called()
        self.mock_session.commit.assert_called_once()
        self.mock_session.refresh.assert_called_once()
    
    async def test_get_session(self):
        """Test getting a session by ID."""
        # Setup
        session_id = "test-session-123"
        session = Session(id=session_id)
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.first.return_value = session
        self.mock_session.execute.return_value = mock_result
        
        # Execute
        result = await self.storage.get_session(session_id)
        
        # Verify
        self.assertEqual(result, session)
        self.mock_session.execute.assert_called_once()
    
    async def test_get_session_not_found(self):
        """Test getting a session that doesn't exist."""
        # Setup
        session_id = "non-existent-session"
        
        # Mock database query - no session found
        mock_result = Mock()
        mock_result.scalars.return_value.first.return_value = None
        self.mock_session.execute.return_value = mock_result
        
        # Execute
        result = await self.storage.get_session(session_id)
        
        # Verify
        self.assertIsNone(result)
    
    async def test_list_sessions(self):
        """Test listing all sessions."""
        # Setup
        session_ids = ["session-1", "session-2", "session-3"]
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = session_ids
        self.mock_session.execute.return_value = mock_result
        
        # Execute
        result = await self.storage.list_sessions()
        
        # Verify
        self.assertEqual(result, session_ids)
        self.assertEqual(len(result), 3)


if __name__ == '__main__':
    unittest.main()

