import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import Any

import asyncpg

logger = logging.getLogger(__name__)


class PubSubManager:
    def __init__(self, database_url: str):
        self.database_url = self._convert_to_asyncpg_url(database_url)
        self._active_connections: set[asyncpg.Connection] = set()

    def _convert_to_asyncpg_url(self, url: str) -> str:
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url.split("?")[0]

    @asynccontextmanager
    async def subscribe(
        self,
        session_id: str,
        queue: asyncio.Queue[dict[str, Any]],
    ) -> asyncpg.Connection:
        conn = await self._subscribe(session_id=session_id, queue=queue)
        try:
            yield conn
        finally:
            await self.cleanup_connection(conn)

    async def _subscribe(
        self,
        session_id: str,
        queue: asyncio.Queue[dict[str, Any]],
    ) -> asyncpg.Connection:
        channel_name = f"ark_sessions_{session_id}"

        def notification_handler(_connection, _pid, _channel, payload):
            event_data = {}
            try:
                event_data = json.loads(payload)
                queue.put_nowait(event_data)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse notification: {e}")
            except asyncio.QueueFull:
                logger.warning(
                    f"Queue full for session {session_id}, dropping event {event_data.get('id', 'unknown')}"
                )

        conn = None
        try:
            conn = await asyncpg.connect(self.database_url)
            self._active_connections.add(conn)

            await conn.add_listener(channel_name, notification_handler)
            logger.info(f"Subscribed to {channel_name}")
            return conn

        except Exception as e:
            logger.error(f"Failed to subscribe: {e}")
            await self.cleanup_connection(conn)
            raise

    async def cleanup_connection(self, conn: asyncpg.Connection) -> None:
        try:
            if conn and not conn.is_closed():
                await conn.execute("UNLISTEN *")
                await conn.close()
            self._active_connections.discard(conn)
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

    async def shutdown(self) -> None:
        logger.info(f"Shutting down PubSubManager ({len(self._active_connections)} connections)")
        for conn in self._active_connections:
            await self.cleanup_connection(conn)
