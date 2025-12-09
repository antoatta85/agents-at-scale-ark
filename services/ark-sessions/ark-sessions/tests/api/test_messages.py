"""Tests for message API endpoints."""

import unittest
from unittest.mock import AsyncMock, Mock
from fastapi.testclient import TestClient

from ark_sessions.main import app
from ark_sessions.core.database import get_session
from ark_sessions.storage.messages import MessageStorage


class TestMessageAPI(unittest.TestCase):
    """Test message API endpoints."""
    
    def setUp(self):
        """Set up test client."""
        self.client = TestClient(app)
        # Override database dependency
        self.mock_session = AsyncMock()
        async def mock_get_session():
            yield self.mock_session
        app.dependency_overrides[get_session] = mock_get_session
    
    def tearDown(self):
        """Clean up dependency overrides."""
        app.dependency_overrides.clear()
    
    def test_add_messages(self):
        """Test adding messages via API."""
        # Setup
        mock_storage = AsyncMock()
        mock_storage.add_messages = AsyncMock()
        
        # Patch MessageStorage to return our mock
        with unittest.mock.patch('ark_sessions.api.messages.MessageStorage', return_value=mock_storage):
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
    
    def test_get_messages(self):
        """Test getting messages via API."""
        # Setup
        from ark_sessions.models import Message
        from datetime import datetime
        
        mock_messages = [
            Message(
                id=1,
                session_id="test-session-123",
                query_id="test-query-456",
                message_data={"role": "user", "content": "Hello"},
                created_at=datetime.utcnow()
            )
        ]
        mock_storage = AsyncMock()
        mock_storage.get_messages = AsyncMock(return_value=mock_messages)
        
        # Patch MessageStorage to return our mock
        with unittest.mock.patch('ark_sessions.api.messages.MessageStorage', return_value=mock_storage):
            # Execute
            response = self.client.get("/messages?session_id=test-session-123")
            
            # Verify
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIsInstance(data, list)
            self.assertEqual(len(data), 1)


if __name__ == '__main__':
    unittest.main()

