package eventing

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"
)

type ModelTracker interface {
	ModelUnavailable(ctx context.Context, model runtime.Object, reason string)
}

type A2aTracker interface {
	AgentCreationFailed(ctx context.Context, obj runtime.Object, reason string)
	AgentDeletionFailed(ctx context.Context, obj runtime.Object, reason string)
	TaskPollingFailed(ctx context.Context, obj runtime.Object, reason string)
}

type AgentTracker interface {
	DependencyUnavailable(ctx context.Context, obj runtime.Object, reason string)
}

type ExecutionEngineTracker interface {
	AddressResolutionFailed(ctx context.Context, obj runtime.Object, reason string)
}

type MCPServerTracker interface {
	AddressResolutionFailed(ctx context.Context, obj runtime.Object, reason string)
	ClientCreationFailed(ctx context.Context, obj runtime.Object, reason string)
	ToolListingFailed(ctx context.Context, obj runtime.Object, reason string)
	ToolCreationFailed(ctx context.Context, obj runtime.Object, reason string)
}

type Provider interface {
	ModelTracker() ModelTracker
	A2aTracker() A2aTracker
	AgentTracker() AgentTracker
	ExecutionEngineTracker() ExecutionEngineTracker
	MCPServerTracker() MCPServerTracker
}
