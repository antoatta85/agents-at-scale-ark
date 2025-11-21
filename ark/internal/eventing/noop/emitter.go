package noop

import (
	"context"

	"github.com/openai/openai-go"
	"k8s.io/apimachinery/pkg/runtime"

	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
	"mckinsey.com/ark/internal/eventing"
)

type NoopEventEmitter struct{}

func NewNoopEventEmitter() eventing.EventEmitter {
	return &NoopEventEmitter{}
}

func (e *NoopEventEmitter) EmitNormal(ctx context.Context, obj runtime.Object, reason, message string) {
}

func (e *NoopEventEmitter) EmitWarning(ctx context.Context, obj runtime.Object, reason, message string) {
}

type noopQueryTracker struct{}

func NewQueryTracker() eventing.QueryTracker {
	return &noopQueryTracker{}
}

func (t *noopQueryTracker) StartTokenCollection(ctx context.Context) context.Context {
	return ctx
}

func (t *noopQueryTracker) AddTokens(ctx context.Context, promptTokens, completionTokens, totalTokens int64) {
}

func (t *noopQueryTracker) AddTokenUsage(ctx context.Context, usage arkv1alpha1.TokenUsage) {
}

func (t *noopQueryTracker) AddCompletionUsage(ctx context.Context, usage openai.CompletionUsage) {
}

func (t *noopQueryTracker) GetTokenSummary(ctx context.Context) arkv1alpha1.TokenUsage {
	return arkv1alpha1.TokenUsage{}
}
