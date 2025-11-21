package eventing

import (
	"context"

	"github.com/openai/openai-go"
	"k8s.io/apimachinery/pkg/runtime"
	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
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

type QueryTracker interface {
	StartTokenCollection(ctx context.Context) context.Context
	AddTokens(ctx context.Context, promptTokens, completionTokens, totalTokens int64)
	AddTokenUsage(ctx context.Context, usage arkv1alpha1.TokenUsage)
	AddCompletionUsage(ctx context.Context, usage openai.CompletionUsage)
	GetTokenSummary(ctx context.Context) arkv1alpha1.TokenUsage
}

type Provider interface {
	ModelTracker() ModelTracker
	A2aTracker() A2aTracker
	AgentTracker() AgentTracker
	ExecutionEngineTracker() ExecutionEngineTracker
	MCPServerTracker() MCPServerTracker
	QueryTracker() QueryTracker
}
