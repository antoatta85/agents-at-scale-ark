"""Pydantic models for Evaluator resources."""

from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel, Field, ConfigDict


class ModelReference(BaseModel):
    """Model reference for an evaluator."""
    name: str
    namespace: Optional[str] = None


class ConfigMapKeyRef(BaseModel):
    """Reference to a key in a ConfigMap."""
    key: str
    name: str = ""
    optional: Optional[bool] = None


class SecretKeyRef(BaseModel):
    """Reference to a key in a Secret."""
    key: str
    name: str = ""
    optional: Optional[bool] = None


class ValueFrom(BaseModel):
    """Reference to external sources for parameter values."""
    configMapKeyRef: Optional[ConfigMapKeyRef] = None
    secretKeyRef: Optional[SecretKeyRef] = None


class ValueSource(BaseModel):
    """Source for a value - either direct or from external reference."""
    value: Optional[str] = None
    valueFrom: Optional[ValueFrom] = None


class Parameter(BaseModel):
    """Parameter for evaluator configuration."""
    name: str
    value: Optional[str] = None
    valueFrom: Optional[ValueFrom] = None


class LabelSelectorRequirement(BaseModel):
    """A label selector requirement."""
    key: str
    operator: str
    values: Optional[List[str]] = None


class LabelSelector(BaseModel):
    """Label selector for resources."""
    matchExpressions: Optional[List[LabelSelectorRequirement]] = None
    matchLabels: Optional[Dict[str, str]] = None


class ResourceSelector(BaseModel):
    """Selector for automatic evaluation of resources."""
    resource: str  # e.g., "Query"
    labelSelector: Optional[LabelSelector] = None


class EvaluatorResponse(BaseModel):
    """Basic evaluator response for list operations."""
    name: str
    namespace: str
    address: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[str] = None
    message: Optional[str] = None


class EvaluatorListResponse(BaseModel):
    """Response for listing evaluators."""
    items: List[EvaluatorResponse]
    count: int


class EvaluatorBatchConfig(BaseModel):
    """Configuration for batch evaluation mode."""
    name: Optional[str] = None
    update_mode: str = Field(..., pattern="^(immutable|dynamic)$")
    group_by_label: Optional[str] = None
    group_by_annotation: Optional[str] = None
    concurrency: Optional[int] = Field(10, ge=1, le=100)
    continue_on_failure: Optional[bool] = True

    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "name": "daily-batch",
                "update_mode": "immutable",
                "group_by_label": "run-id",
                "concurrency": 10,
                "continue_on_failure": True,
            }
        },
    )


class EvaluatorCreateRequest(BaseModel):
    """Request body for creating an evaluator."""
    name: str
    address: ValueSource
    description: Optional[str] = None
    selector: Optional[ResourceSelector] = None
    parameters: Optional[List[Parameter]] = None
    query_age_filter: Optional[str] = Field("all", pattern="^(all|afterEvaluator|afterTimestamp)$")
    created_after: Optional[datetime] = None
    evaluation_mode: Optional[str] = Field("individual", pattern="^(individual|batch)$")
    batch_config: Optional[EvaluatorBatchConfig] = None


class EvaluatorUpdateRequest(BaseModel):
    """Request body for updating an evaluator."""
    address: Optional[ValueSource] = None
    description: Optional[str] = None
    selector: Optional[ResourceSelector] = None
    parameters: Optional[List[Parameter]] = None
    query_age_filter: Optional[str] = None
    created_after: Optional[datetime] = None
    evaluation_mode: Optional[str] = None
    batch_config: Optional[EvaluatorBatchConfig] = None


class EvaluatorDetailResponse(BaseModel):
    """Detailed evaluator response model."""
    name: str
    namespace: str
    spec: dict
    status: Optional[dict] = None
    metadata: dict


def evaluator_to_response(evaluator: dict) -> EvaluatorResponse:
    """Convert a Kubernetes evaluator object to response model."""
    spec = evaluator.get("spec", {})
    status = evaluator.get("status", {})
    
    # Extract address value
    address = None
    if "address" in spec:
        if isinstance(spec["address"], dict):
            address = spec["address"].get("value")
        else:
            address = spec["address"]
    
    return EvaluatorResponse(
        name=evaluator["metadata"]["name"],
        namespace=evaluator["metadata"]["namespace"],
        address=address,
        description=spec.get("description"),
        phase=status.get("phase"),
        message=status.get("message")
    )


def evaluator_to_detail_response(evaluator: dict) -> EvaluatorDetailResponse:
    """Convert a Kubernetes evaluator object to detailed response model."""
    return EvaluatorDetailResponse(
        name=evaluator["metadata"]["name"],
        namespace=evaluator["metadata"]["namespace"],
        spec=evaluator.get("spec", {}),
        status=evaluator.get("status"),
        metadata=evaluator.get("metadata", {})
    )