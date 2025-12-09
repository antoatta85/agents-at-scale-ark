"""Tests for OTLP trace ingestion."""

import unittest
from unittest.mock import AsyncMock, Mock, patch
from fastapi.testclient import TestClient

from ark_sessions.main import app
from ark_sessions.api.otlp import (
    extract_session_id_from_attributes,
    determine_session_id,
    nanoseconds_to_datetime,
)


class TestOTLPHelpers(unittest.TestCase):
    """Test OTLP helper functions."""
    
    def test_extract_session_id_from_attributes_ark_prefix(self):
        """Test extracting session_id with ark.session_id key."""
        attributes = {"ark.session_id": "test-session-123"}
        result = extract_session_id_from_attributes(attributes)
        self.assertEqual(result, "test-session-123")
    
    def test_extract_session_id_from_attributes_standard_key(self):
        """Test extracting session_id with session_id key."""
        attributes = {"session_id": "test-session-456"}
        result = extract_session_id_from_attributes(attributes)
        self.assertEqual(result, "test-session-456")
    
    def test_extract_session_id_from_attributes_not_found(self):
        """Test extracting session_id when not present."""
        attributes = {"other_key": "value"}
        result = extract_session_id_from_attributes(attributes)
        self.assertIsNone(result)
    
    def test_extract_session_id_from_attributes_empty_string(self):
        """Test extracting session_id when value is empty string."""
        attributes = {"session_id": ""}
        result = extract_session_id_from_attributes(attributes)
        self.assertIsNone(result)
    
    def test_determine_session_id_priority(self):
        """Test session_id determination priority."""
        # Priority: span_attrs > resource_attrs > trace_id
        span_attrs = {"session_id": "span-session"}
        resource_attrs = {"session_id": "resource-session"}
        trace_id = "trace-123"
        
        result = determine_session_id(resource_attrs, span_attrs, trace_id)
        self.assertEqual(result, "span-session")
        
        # If span_attrs doesn't have it, use resource_attrs
        span_attrs_empty = {}
        result = determine_session_id(resource_attrs, span_attrs_empty, trace_id)
        self.assertEqual(result, "resource-session")
        
        # If neither has it, use trace_id
        resource_attrs_empty = {}
        result = determine_session_id(resource_attrs_empty, span_attrs_empty, trace_id)
        self.assertEqual(result, trace_id)
    
    def test_nanoseconds_to_datetime(self):
        """Test converting nanoseconds to datetime."""
        from datetime import datetime
        
        # Test with known timestamp: 2024-01-01 00:00:00 UTC = 1704067200 seconds
        nanos = 1704067200 * 1_000_000_000
        result = nanoseconds_to_datetime(nanos)
        
        self.assertIsInstance(result, datetime)
        self.assertEqual(result.year, 2024)
        self.assertEqual(result.month, 1)
        self.assertEqual(result.day, 1)


class TestOTLPAPI(unittest.TestCase):
    """Test OTLP API endpoints."""
    
    def setUp(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    @patch('ark_sessions.api.otlp.TraceStorage')
    @patch('ark_sessions.api.otlp.get_session')
    async def test_receive_otlp_traces_empty_body(self, mock_get_session, mock_trace_storage_class):
        """Test receiving OTLP traces with empty body."""
        # Setup
        mock_session = AsyncMock()
        mock_get_session.return_value.__aenter__.return_value = mock_session
        
        # Execute
        response = self.client.post(
            "/v1/traces",
            content=b"",
            headers={"content-type": "application/x-protobuf"},
        )
        
        # Verify
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertEqual(data["status"], "error")


if __name__ == '__main__':
    unittest.main()

