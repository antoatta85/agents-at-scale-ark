from datetime import datetime
from fastapi import APIRouter, Query
from typing import Optional
from ark_sdk.models.a2_a_task_v1alpha1 import A2ATaskV1alpha1
from ark_sdk.models.a2_a_task_v1alpha1_spec import A2ATaskV1alpha1Spec
from ark_sdk.client import with_ark_client

from ...models.a2atasks import (
    A2ATaskResponse,
    A2ATaskListResponse,
    A2ATaskCreateRequest,
    A2ATaskDetailResponse
)
from .exceptions import handle_k8s_errors

router = APIRouter(
    prefix="/a2atasks",
    tags=["a2atasks"]
)

VERSION = "v1alpha1"


def a2atask_to_response(task: dict) -> A2ATaskResponse:
    creation_timestamp = None
    if "creationTimestamp" in task["metadata"]:
        creation_timestamp = datetime.fromisoformat(
            task["metadata"]["creationTimestamp"].replace("Z", "+00:00")
        )

    return A2ATaskResponse(
        name=task["metadata"]["name"],
        namespace=task["metadata"]["namespace"],
        queryName=task["spec"].get("queryName"),
        status=task.get("status"),
        creationTimestamp=creation_timestamp
    )


def a2atask_to_detail_response(task: dict) -> A2ATaskDetailResponse:
    spec = task["spec"]
    metadata = task["metadata"]

    return A2ATaskDetailResponse(
        name=metadata["name"],
        namespace=metadata["namespace"],
        queryName=spec.get("queryName"),
        a2aServerRef=spec.get("a2aServerRef"),
        agentRef=spec.get("agentRef"),
        queryRef=spec.get("queryRef"),
        metadata=metadata,
        status=task.get("status")
    )


@router.get("", response_model=A2ATaskListResponse)
@handle_k8s_errors(operation="list", resource_type="a2atask")
async def list_a2atasks(namespace: Optional[str] = Query(None, description="Namespace for this request (defaults to current context)")) -> A2ATaskListResponse:
    async with with_ark_client(namespace, VERSION) as ark_client:
        result = await ark_client.a2atasks.a_list()

        tasks = [a2atask_to_response(item.to_dict()) for item in result]

        return A2ATaskListResponse(
            items=tasks,
            count=len(tasks)
        )


@router.post("", response_model=A2ATaskDetailResponse)
@handle_k8s_errors(operation="create", resource_type="a2atask")
async def create_a2atask(
    task: A2ATaskCreateRequest,
    namespace: Optional[str] = Query(None, description="Namespace for this request (defaults to current context)")
) -> A2ATaskDetailResponse:
    async with with_ark_client(namespace, VERSION) as ark_client:
        spec = {"queryName": task.queryName}

        if task.a2aServerRef:
            spec["a2aServerRef"] = task.a2aServerRef
        if task.agentRef:
            spec["agentRef"] = task.agentRef
        if task.queryRef:
            spec["queryRef"] = task.queryRef

        task_resource = A2ATaskV1alpha1(
            metadata={"name": task.name},
            spec=A2ATaskV1alpha1Spec(**spec)
        )

        created = await ark_client.a2atasks.a_create(task_resource)
        return a2atask_to_detail_response(created.to_dict())


@router.get("/{name}", response_model=A2ATaskDetailResponse)
@handle_k8s_errors(operation="get", resource_type="a2atask")
async def get_a2atask(
    name: str,
    namespace: Optional[str] = Query(None, description="Namespace for this request (defaults to current context)")
) -> A2ATaskDetailResponse:
    async with with_ark_client(namespace, VERSION) as ark_client:
        task = await ark_client.a2atasks.a_read(name)
        return a2atask_to_detail_response(task.to_dict())


@router.delete("/{name}")
@handle_k8s_errors(operation="delete", resource_type="a2atask")
async def delete_a2atask(
    name: str,
    namespace: Optional[str] = Query(None, description="Namespace for this request (defaults to current context)")
):
    async with with_ark_client(namespace, VERSION) as ark_client:
        await ark_client.a2atasks.a_delete(name)
        return {"status": "deleted"}
