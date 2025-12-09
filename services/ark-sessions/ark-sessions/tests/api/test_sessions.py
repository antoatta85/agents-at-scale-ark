"""Tests for session API endpoints."""

import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from ark_sessions.main import app
from ark_sessions.models import Message, SessionEvent
from ark_sessions.api.sessions import _derive_queries_from_events, _derive_conversations_from_messages


class TestSessionsAPI(unittest.TestCase):
    """Test session API endpoints."""
    
    def setUp(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    @patch('ark_sessions.api.sessions.SessionStorage')
    @patch('ark_sessions.api.sessions.get_session')
    async def test_list_sessions(self, mock_get_session, mock_session_storage_class):
        """Test listing all sessions."""
        # Setup
        mock_session = AsyncMock()
        mock_get_session.return_value.__aenter__.return_value = mock_session
        
        mock_storage = AsyncMock()
        mock_storage.list_sessions = AsyncMock(return_value=["session-1", "session-2"])
        mock_session_storage_class.return_value = mock_storage
        
        # Execute
        response = self.client.get("/sessions")
        
        # Verify
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["sessions"]), 2)
    
    @patch('ark_sessions.api.sessions.MessageStorage')
    @patch('ark_sessions.api.sessions.EventStorage')
    @patch('ark_sessions.api.sessions.SessionStorage')
    @patch('ark_sessions.api.sessions.get_session')
    async def test_get_session_by_id(self, mock_get_session, mock_session_storage_class, mock_event_storage_class, mock_message_storage_class):
        """Test getting a session by ID."""
        # Setup
        from datetime import datetime
        
        mock_session = AsyncMock()
        mock_get_session.return_value.__aenter__.return_value = mock_session
        
        # Mock session storage
        mock_session_storage = AsyncMock()
        mock_session_obj = Mock()
        mock_session_obj.id = "test-session-123"
        mock_session_storage.get_session = AsyncMock(return_value=mock_session_obj)
        mock_session_storage_class.return_value = mock_session_storage
        
        # Mock event storage
        mock_event_storage = AsyncMock()
        mock_events = [
            SessionEvent(
                id=1,
                session_id="test-session-123",
                query_id="query-1",
                reason="QueryStart",
                query_name="Test Query",
                timestamp=datetime.utcnow(),
            ),
        ]
        mock_event_storage.get_events_by_session = AsyncMock(return_value=mock_events)
        mock_event_storage_class.return_value = mock_event_storage
        
        # Mock message storage
        mock_message_storage = AsyncMock()
        mock_message_storage.get_messages = AsyncMock(return_value=[])
        mock_message_storage_class.return_value = mock_message_storage
        
        # Execute
        response = self.client.get("/sessions/test-session-123")
        
        # Verify
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "test-session-123")
        self.assertIn("queries", data)
        self.assertIn("conversations", data)
    
    @patch('ark_sessions.api.sessions.SessionStorage')
    @patch('ark_sessions.api.sessions.get_session')
    async def test_get_session_not_found(self, mock_get_session, mock_session_storage_class):
        """Test getting a session that doesn't exist."""
        # Setup
        mock_session = AsyncMock()
        mock_get_session.return_value.__aenter__.return_value = mock_session
        
        mock_storage = AsyncMock()
        mock_storage.get_session = AsyncMock(return_value=None)
        mock_session_storage_class.return_value = mock_storage
        
        # Execute
        response = self.client.get("/sessions/non-existent-session")
        
        # Verify
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["id"], "non-existent-session")
        self.assertEqual(data["queries"], [])
        self.assertEqual(data["conversations"], [])


class TestSessionHelpers(unittest.TestCase):
    """Test helper functions for session derivation."""
    
    def test_derive_queries_from_events(self):
        """Test deriving queries from events."""
        from datetime import datetime
        
        events = [
            SessionEvent(
                id=1,
                session_id="session-1",
                query_id="query-1",
                reason="QueryStart",
                query_name="Test Query",
                timestamp=datetime.utcnow(),
            ),
            SessionEvent(
                id=2,
                session_id="session-1",
                query_id="query-1",
                reason="QueryComplete",
                query_name="Test Query",
                duration_ms=5000.0,
                timestamp=datetime.utcnow(),
            ),
        ]
        
        queries = _derive_queries_from_events(events)
        
        self.assertEqual(len(queries), 1)
        self.assertEqual(queries[0].id, "query-1")
        self.assertEqual(queries[0].status, "completed")
        self.assertEqual(queries[0].duration_ms, 5000.0)
    
    def test_derive_conversations_from_messages(self):
        """Test deriving conversations from messages."""
        from datetime import datetime
        
        messages = [
            Message(
                id=1,
                session_id="session-1",
                conversation_id="conv-1",
                message_data={"role": "user", "content": "Hello"},
                created_at=datetime.utcnow(),
            ),
            Message(
                id=2,
                session_id="session-1",
                conversation_id="conv-1",
                message_data={"role": "assistant", "content": "Hi there!"},
                created_at=datetime.utcnow(),
            ),
        ]
        
        conversations = _derive_conversations_from_messages(messages)
        
        self.assertEqual(len(conversations), 1)
        self.assertEqual(conversations[0].id, "conv-1")
        self.assertIsNotNone(conversations[0].firstMessage)
        self.assertIsNotNone(conversations[0].lastMessage)


if __name__ == '__main__':
    unittest.main()

