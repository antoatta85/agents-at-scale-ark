"""Kubernetes ConfigMaps API endpoints."""
import logging
from fastapi import APIRouter, Query
from typing import Optional, Dict, Any
from kubernetes_asyncio import client, config
from ark_sdk.k8s import get_namespace
from .exceptions import handle_k8s_errors

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/configmaps", tags=["configmaps"])


async def get_k8s_client():
    """Initialize and return a Kubernetes client."""
    try:
        config.load_incluster_config()
    except config.ConfigException:
        await config.load_kube_config()
    return client.CoreV1Api()


@router.get("/{configmap_name}", response_model=Dict[str, Any])
@handle_k8s_errors(operation="get", resource_type="configmap")
async def get_configmap(
    configmap_name: str,
    namespace: Optional[str] = Query(None, description="Namespace for this request (defaults to current context)")
) -> Dict[str, Any]:
    """Get a specific ConfigMap and return its data."""
    api = await get_k8s_client()

    if namespace is None:
        namespace = get_namespace()

    configmap = await api.read_namespaced_config_map(
        name=configmap_name,
        namespace=namespace
    )

    return {
        "name": configmap.metadata.name,
        "namespace": configmap.metadata.namespace,
        "data": configmap.data or {},
    }
