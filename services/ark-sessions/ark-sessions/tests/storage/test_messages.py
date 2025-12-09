"""Tests for message storage operations."""

import unittest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from ark_sessions.models import Message
from ark_sessions.storage.messages import MessageStorage


class TestMessageStorage(unittest.IsolatedAsyncioTestCase):
    """Test message storage functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_session = AsyncMock(spec=AsyncSession)
        self.storage = MessageStorage(self.mock_session)
    
    @patch('ark_sessions.storage.messages.SessionStorage')
    async def test_add_messages(self, mock_session_storage_class):
        """Test adding messages to a session."""
        # Setup
        session_id = "test-session-123"
        query_id = "test-query-456"
        messages = [
            {"role": "user", "content": "Hello"},
            {"role": "assistant", "content": "Hi there!"}
        ]
        
        # Mock session storage
        mock_session_storage = AsyncMock()
        mock_session_storage.create_session = AsyncMock()
        mock_session_storage_class.return_value = mock_session_storage
        
        # Mock commit
        self.mock_session.commit = AsyncMock()
        
        # Execute
        await self.storage.add_messages(session_id, messages, query_id)
        
        # Verify
        self.assertEqual(self.mock_session.add.call_count, 2)
        self.mock_session.commit.assert_called_once()
        mock_session_storage.create_session.assert_called_once_with(session_id)
    
    async def test_get_messages_by_session(self):
        """Test getting messages filtered by session_id."""
        # Setup
        session_id = "test-session-123"
        messages = [
            Message(session_id=session_id, query_id=None, message_data={"role": "user", "content": "Hello"}),
            Message(session_id=session_id, query_id=None, message_data={"role": "assistant", "content": "Hi"}),
        ]
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = messages
        self.mock_session.execute.return_value = mock_result
        
        # Execute
        result = await self.storage.get_messages(session_id=session_id)
        
        # Verify
        self.assertEqual(len(result), 2)
        self.assertEqual(result, messages)
    
    async def test_get_messages_by_query(self):
        """Test getting messages filtered by query_id."""
        # Setup
        query_id = "test-query-456"
        messages = [
            Message(session_id="session-1", query_id=query_id, message_data={"role": "user", "content": "Hello"}),
        ]
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = messages
        self.mock_session.execute.return_value = mock_result
        
        # Execute
        result = await self.storage.get_messages(query_id=query_id)
        
        # Verify
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].query_id, query_id)
    
    async def test_get_messages_no_filters(self):
        """Test getting all messages without filters."""
        # Setup
        messages = [
            Message(session_id="session-1", query_id=None, message_data={"role": "user", "content": "Hello"}),
            Message(session_id="session-2", query_id=None, message_data={"role": "user", "content": "World"}),
        ]
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = messages
        self.mock_session.execute.return_value = mock_result
        
        # Execute
        result = await self.storage.get_messages()
        
        # Verify
        self.assertEqual(len(result), 2)


if __name__ == '__main__':
    unittest.main()

