import asyncio
import json
from unittest.mock import AsyncMock, Mock, patch

import pytest

from ark_sessions.core.pubsub import PubSubManager


@pytest.fixture
def manager():
    return PubSubManager("postgresql+asyncpg://user:pass@localhost/db")

@pytest.mark.asyncio
async def test_convert_asyncpg_url():
    manager = PubSubManager("postgresql://user:pass@localhost/db?param=value")
    assert manager.database_url == "postgresql+asyncpg://user:pass@localhost/db"


@pytest.mark.asyncio
async def test_subscribe_creates_connection(manager):
    mock_conn = AsyncMock()
    mock_conn.add_listener = AsyncMock()

    with patch("asyncpg.connect", return_value=mock_conn):
        queue = asyncio.Queue()
        conn = await manager.subscribe("session-123", queue)

        mock_conn.add_listener.assert_called_once()
        call_args = mock_conn.add_listener.call_args
        assert call_args[0][0] == "ark_sessions_session-123"
        assert conn is mock_conn


@pytest.mark.asyncio
async def test_notification_handler_queues_event(manager):
    mock_conn = AsyncMock()
    handler = None

    async def capture_handler(channel, callback):
        nonlocal handler
        handler = callback

    mock_conn.add_listener = capture_handler

    with patch("asyncpg.connect", return_value=mock_conn):
        queue = asyncio.Queue()
        await manager.subscribe("session-123", queue)

        event_data = {"id": 1, "reason": "QueryStart"}
        handler(mock_conn, 12345, "ark_sessions_session-123", json.dumps(event_data))

        received = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert received == event_data


@pytest.mark.asyncio
async def test_notification_handler_handles_full_queue(manager):
    mock_conn = AsyncMock()
    handler = None

    async def capture_handler(channel, callback):
        nonlocal handler
        handler = callback

    mock_conn.add_listener = capture_handler

    with patch("asyncpg.connect", return_value=mock_conn):
        queue = asyncio.Queue(maxsize=1)
        await manager.subscribe("session-123", queue)

        event_data1 = {"id": 1, "reason": "QueryStart"}
        event_data2 = {"id": 2, "reason": "QueryComplete"}

        handler(mock_conn, 12345, "ark_sessions_session-123", json.dumps(event_data1))
        handler(mock_conn, 12345, "ark_sessions_session-123", json.dumps(event_data2))

        received = await asyncio.wait_for(queue.get(), timeout=1.0)
        assert received == event_data1

        assert queue.qsize() == 0


@pytest.mark.asyncio
async def test_cleanup_connection(manager):
    mock_conn = AsyncMock()
    mock_conn.is_closed = Mock(return_value=False)
    mock_conn.execute = AsyncMock()
    manager._active_connections = {mock_conn}

    await manager.cleanup_connection(mock_conn)

    mock_conn.execute.assert_called_once_with("UNLISTEN *")
    mock_conn.close.assert_called_once()
    assert mock_conn not in manager._active_connections


@pytest.mark.asyncio
async def test_cleanup_connection_handles_closed():
    manager = PubSubManager("postgresql+asyncpg://user:pass@localhost/db")
    mock_conn = AsyncMock()
    mock_conn.is_closed = Mock(return_value=True)
    manager._active_connections = {mock_conn}

    await manager.cleanup_connection(mock_conn)

    mock_conn.execute.assert_not_called()
    mock_conn.close.assert_not_called()
    assert mock_conn not in manager._active_connections


@pytest.mark.asyncio
async def test_shutdown_closes_all_connections(manager):
    mock_conn1 = AsyncMock()
    mock_conn2 = AsyncMock()

    manager._active_connections = {mock_conn1, mock_conn2}

    with patch.object(manager, "cleanup_connection", new_callable=AsyncMock) as mock_cleanup:
        await manager.shutdown()

        assert mock_cleanup.call_count == 2


@pytest.mark.asyncio
async def test_subscribe_failure_cleanup(manager):
    mock_conn = AsyncMock()
    mock_conn.add_listener = AsyncMock(side_effect=Exception("Connection error"))
    mock_conn.is_closed = Mock(return_value=False)

    with patch("asyncpg.connect", return_value=mock_conn):
        queue = asyncio.Queue()

        with pytest.raises(Exception, match="Connection error"):
            await manager.subscribe("session-123", queue)

        assert mock_conn not in manager._active_connections
