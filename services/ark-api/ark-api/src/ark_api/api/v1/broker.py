"""Broker API endpoints for real-time streaming of traces, messages, and chunks."""
import json
import logging
import os

import httpx
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse, JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/broker", tags=["broker"])

CLUSTER_MEMORY_URL = os.environ.get("ARK_CLUSTER_MEMORY_URL", "http://ark-cluster-memory:3000")


async def proxy_sse_stream(url: str):
    """Proxy SSE stream from cluster-memory service."""
    timeout = httpx.Timeout(10.0, read=None)
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("GET", url) as response:
                if response.status_code != 200:
                    try:
                        response_text = await response.aread()
                        error_data = json.loads(response_text.decode("utf-8"))
                        yield f"data: {json.dumps({'error': error_data})}\n\n"
                    except (json.JSONDecodeError, ValueError):
                        yield f"data: {json.dumps({'error': {'message': f'{response.status_code} {response.reason_phrase}', 'type': 'server_error'}})}\n\n"
                    return

                async for line in response.aiter_lines():
                    if line.strip():
                        yield line + "\n\n"
    except httpx.ConnectError as e:
        logger.error(f"Failed to connect to cluster-memory at {url}: {e}")
        yield f"data: {json.dumps({'error': {'message': 'Failed to connect to cluster-memory service', 'type': 'connection_error'}})}\n\n"
    except Exception as e:
        logger.error(f"Error proxying SSE stream: {e}")
        yield f"data: {json.dumps({'error': {'message': str(e), 'type': 'server_error'}})}\n\n"


sse_headers = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
}


@router.get("/traces")
async def get_traces(
    watch: bool = Query(False, description="Stream traces via SSE"),
):
    """Get or stream OTEL traces from the broker."""
    if watch:
        url = f"{CLUSTER_MEMORY_URL}/traces?watch=true"
        logger.info(f"Proxying trace SSE stream from {url}")
        return StreamingResponse(
            proxy_sse_stream(url),
            media_type="text/event-stream",
            headers=sse_headers,
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{CLUSTER_MEMORY_URL}/traces")
            return JSONResponse(content=response.json(), status_code=response.status_code)
    except httpx.ConnectError as e:
        logger.error(f"Failed to connect to cluster-memory: {e}")
        return JSONResponse(
            content={"error": {"message": "Failed to connect to cluster-memory service", "type": "connection_error"}},
            status_code=503,
        )
    except Exception as e:
        logger.error(f"Error fetching traces: {e}")
        return JSONResponse(
            content={"error": {"message": str(e), "type": "server_error"}},
            status_code=500,
        )


@router.get("/traces/{trace_id}")
async def get_trace(
    trace_id: str,
    watch: bool = Query(False, description="Stream trace spans via SSE"),
    from_beginning: bool = Query(True, alias="from-beginning", description="Include existing spans"),
):
    """Get or stream a specific trace from the broker."""
    if watch:
        url = f"{CLUSTER_MEMORY_URL}/traces/{trace_id}?watch=true"
        if from_beginning:
            url += "&from-beginning=true"
        logger.info(f"Proxying trace SSE stream from {url}")
        return StreamingResponse(
            proxy_sse_stream(url),
            media_type="text/event-stream",
            headers=sse_headers,
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{CLUSTER_MEMORY_URL}/traces/{trace_id}")
            return JSONResponse(content=response.json(), status_code=response.status_code)
    except httpx.ConnectError as e:
        logger.error(f"Failed to connect to cluster-memory: {e}")
        return JSONResponse(
            content={"error": {"message": "Failed to connect to cluster-memory service", "type": "connection_error"}},
            status_code=503,
        )
    except Exception as e:
        logger.error(f"Error fetching trace: {e}")
        return JSONResponse(
            content={"error": {"message": str(e), "type": "server_error"}},
            status_code=500,
        )


@router.get("/messages")
async def get_messages(
    watch: bool = Query(False, description="Stream messages via SSE"),
    session_id: str = Query(None, alias="session-id", description="Filter by session ID"),
):
    """Get or stream messages from the broker."""
    if watch:
        url = f"{CLUSTER_MEMORY_URL}/messages?watch=true"
        if session_id:
            url += f"&session-id={session_id}"
        logger.info(f"Proxying messages SSE stream from {url}")
        return StreamingResponse(
            proxy_sse_stream(url),
            media_type="text/event-stream",
            headers=sse_headers,
        )

    try:
        async with httpx.AsyncClient() as client:
            url = f"{CLUSTER_MEMORY_URL}/messages"
            if session_id:
                url += f"?session-id={session_id}"
            response = await client.get(url)
            return JSONResponse(content=response.json(), status_code=response.status_code)
    except httpx.ConnectError as e:
        logger.error(f"Failed to connect to cluster-memory: {e}")
        return JSONResponse(
            content={"error": {"message": "Failed to connect to cluster-memory service", "type": "connection_error"}},
            status_code=503,
        )
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
        return JSONResponse(
            content={"error": {"message": str(e), "type": "server_error"}},
            status_code=500,
        )


@router.get("/chunks")
async def get_chunks(
    watch: bool = Query(False, description="Stream chunks via SSE"),
    query_id: str = Query(None, alias="query-id", description="Filter by query ID"),
):
    """Get or stream LLM chunks from the broker."""
    if watch:
        if query_id:
            url = f"{CLUSTER_MEMORY_URL}/stream/{query_id}?from-beginning=true"
        else:
            url = f"{CLUSTER_MEMORY_URL}/stream-statistics"
            logger.info("No query-id specified for chunks watch, returning statistics")
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(url)
                    return JSONResponse(content=response.json(), status_code=response.status_code)
            except Exception as e:
                logger.error(f"Error fetching stream statistics: {e}")
                return JSONResponse(
                    content={"error": {"message": str(e), "type": "server_error"}},
                    status_code=500,
                )

        logger.info(f"Proxying chunks SSE stream from {url}")
        return StreamingResponse(
            proxy_sse_stream(url),
            media_type="text/event-stream",
            headers=sse_headers,
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{CLUSTER_MEMORY_URL}/stream-statistics")
            return JSONResponse(content=response.json(), status_code=response.status_code)
    except httpx.ConnectError as e:
        logger.error(f"Failed to connect to cluster-memory: {e}")
        return JSONResponse(
            content={"error": {"message": "Failed to connect to cluster-memory service", "type": "connection_error"}},
            status_code=503,
        )
    except Exception as e:
        logger.error(f"Error fetching chunks: {e}")
        return JSONResponse(
            content={"error": {"message": str(e), "type": "server_error"}},
            status_code=500,
        )


@router.delete("/traces")
async def purge_traces():
    """Purge all traces from the broker."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.delete(f"{CLUSTER_MEMORY_URL}/traces")
            return JSONResponse(content=response.json(), status_code=response.status_code)
    except httpx.ConnectError as e:
        logger.error(f"Failed to connect to cluster-memory: {e}")
        return JSONResponse(
            content={"error": {"message": "Failed to connect to cluster-memory service", "type": "connection_error"}},
            status_code=503,
        )
    except Exception as e:
        logger.error(f"Error purging traces: {e}")
        return JSONResponse(
            content={"error": {"message": str(e), "type": "server_error"}},
            status_code=500,
        )
