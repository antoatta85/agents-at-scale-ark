"""Tests for message API endpoints."""

import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from ark_sessions.main import app


class TestMessageAPI(unittest.TestCase):
    """Test message API endpoints."""
    
    def setUp(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    @patch('ark_sessions.api.messages.MessageStorage')
    @patch('ark_sessions.api.messages.get_session')
    async def test_add_messages(self, mock_get_session, mock_message_storage_class):
        """Test adding messages via API."""
        # Setup
        mock_session = AsyncMock()
        mock_get_session.return_value.__aenter__.return_value = mock_session
        
        mock_storage = AsyncMock()
        mock_storage.add_messages = AsyncMock()
        mock_message_storage_class.return_value = mock_storage
        
        request_data = {
            "session_id": "test-session-123",
            "query_id": "test-query-456",
            "messages": [
                {"role": "user", "content": "Hello"},
                {"role": "assistant", "content": "Hi there!"}
            ]
        }
        
        # Execute
        response = self.client.post("/messages", json=request_data)
        
        # Verify
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
    
    @patch('ark_sessions.api.messages.MessageStorage')
    @patch('ark_sessions.api.messages.get_session')
    async def test_get_messages(self, mock_get_session, mock_message_storage_class):
        """Test getting messages via API."""
        # Setup
        from ark_sessions.models import Message
        from datetime import datetime
        
        mock_session = AsyncMock()
        mock_get_session.return_value.__aenter__.return_value = mock_session
        
        mock_storage = AsyncMock()
        mock_messages = [
            Message(
                id=1,
                session_id="test-session-123",
                query_id="test-query-456",
                message_data={"role": "user", "content": "Hello"},
                created_at=datetime.utcnow()
            )
        ]
        mock_storage.get_messages = AsyncMock(return_value=mock_messages)
        mock_message_storage_class.return_value = mock_storage
        
        # Execute
        response = self.client.get("/messages?session_id=test-session-123")
        
        # Verify
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 1)


if __name__ == '__main__':
    unittest.main()

