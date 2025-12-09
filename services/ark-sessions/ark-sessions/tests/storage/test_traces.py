"""Tests for trace storage operations."""

import unittest
from unittest.mock import AsyncMock, Mock, patch
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from ark_sessions.models import Span, SpanEvent, Trace
from ark_sessions.storage.traces import TraceStorage


class TestTraceStorage(unittest.IsolatedAsyncioTestCase):
    """Test trace storage functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.mock_session = AsyncMock(spec=AsyncSession)
        self.storage = TraceStorage(self.mock_session)
    
    @patch('ark_sessions.storage.traces.SessionStorage')
    async def test_store_trace_new(self, mock_session_storage_class):
        """Test storing a new trace."""
        # Setup
        mock_session_storage = AsyncMock()
        mock_session_storage.create_session = AsyncMock()
        mock_session_storage_class.return_value = mock_session_storage
        
        trace = Trace(
            trace_id="trace-123",
            session_id="session-123",
            start_time=datetime.utcnow(),
        )
        spans = [
            Span(
                trace_id="trace-123",
                span_id="span-1",
                session_id="session-123",
                name="test-span",
                kind="SPAN_KIND_SERVER",
                start_time=datetime.utcnow(),
                status="ok",
                attributes={},
                resource_attrs={},
            )
        ]
        span_events = []
        
        # Mock database queries - trace doesn't exist
        mock_trace_result = Mock()
        mock_trace_result.scalar_one_or_none.return_value = None
        self.mock_session.execute.return_value = mock_trace_result
        
        # Mock span query - span doesn't exist
        mock_span_result = Mock()
        mock_span_result.scalar_one_or_none.return_value = None
        
        # Setup execute to return different results for different calls
        def execute_side_effect(*args, **kwargs):
            if "Trace" in str(args[0]):
                return mock_trace_result
            return mock_span_result
        
        self.mock_session.execute.side_effect = execute_side_effect
        self.mock_session.commit = AsyncMock()
        
        # Execute
        await self.storage.store_trace(trace, spans, span_events)
        
        # Verify
        self.mock_session.add.assert_called()
        self.mock_session.commit.assert_called_once()
        mock_session_storage.create_session.assert_called_once_with("session-123")
    
    async def test_get_traces_by_session(self):
        """Test getting traces by session ID."""
        # Setup
        session_id = "test-session-123"
        traces = [
            Trace(
                trace_id="trace-1",
                session_id=session_id,
                start_time=datetime(2024, 1, 1, 10, 0, 0),
            ),
        ]
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = traces
        self.mock_session.execute.return_value = mock_result
        
        # Execute
        result = await self.storage.get_traces_by_session(session_id)
        
        # Verify
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].session_id, session_id)
    
    async def test_get_spans_by_trace(self):
        """Test getting spans by trace ID."""
        # Setup
        trace_id = "test-trace-123"
        spans = [
            Span(
                trace_id=trace_id,
                span_id="span-1",
                session_id="session-1",
                name="test-span",
                kind="SPAN_KIND_SERVER",
                start_time=datetime.utcnow(),
                status="ok",
                attributes={},
                resource_attrs={},
            ),
        ]
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = spans
        self.mock_session.execute.return_value = mock_result
        
        # Execute
        result = await self.storage.get_spans_by_trace(trace_id)
        
        # Verify
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].trace_id, trace_id)
    
    async def test_get_span_events_by_span(self):
        """Test getting span events by span ID."""
        # Setup
        span_id = "test-span-123"
        events = [
            SpanEvent(
                trace_id="trace-1",
                span_id=span_id,
                session_id="session-1",
                name="event-1",
                time=datetime.utcnow(),
                attributes={},
            ),
        ]
        
        # Mock database query
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = events
        self.mock_session.execute.return_value = mock_result
        
        # Execute
        result = await self.storage.get_span_events_by_span(span_id)
        
        # Verify
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0].span_id, span_id)


if __name__ == '__main__':
    unittest.main()

