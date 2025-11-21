package trackers

import (
	"context"

	"github.com/openai/openai-go"
	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
	"mckinsey.com/ark/internal/eventing"
)

type tokenCollectorKeyType struct{}

var tokenCollectorKey = tokenCollectorKeyType{}

type queryTracker struct {
	emitter eventing.EventEmitter
}

func NewQueryTracker(emitter eventing.EventEmitter) eventing.QueryTracker {
	return &queryTracker{
		emitter: emitter,
	}
}

func (t *queryTracker) StartTokenCollection(ctx context.Context) context.Context {
	collector := eventing.NewTokenCollector()
	return context.WithValue(ctx, tokenCollectorKey, collector)
}

func (t *queryTracker) AddTokens(ctx context.Context, promptTokens, completionTokens, totalTokens int64) {
	collector, ok := ctx.Value(tokenCollectorKey).(eventing.TokenCollector)
	if !ok || collector == nil {
		return
	}
	collector.AddTokens(promptTokens, completionTokens, totalTokens)
}

func (t *queryTracker) AddTokenUsage(ctx context.Context, usage arkv1alpha1.TokenUsage) {
	collector, ok := ctx.Value(tokenCollectorKey).(eventing.TokenCollector)
	if !ok || collector == nil {
		return
	}
	collector.AddTokens(usage.PromptTokens, usage.CompletionTokens, usage.TotalTokens)
}

func (t *queryTracker) AddCompletionUsage(ctx context.Context, usage openai.CompletionUsage) {
	collector, ok := ctx.Value(tokenCollectorKey).(eventing.TokenCollector)
	if !ok || collector == nil {
		return
	}
	collector.AddTokens(usage.PromptTokens, usage.CompletionTokens, usage.TotalTokens)
}

func (t *queryTracker) GetTokenSummary(ctx context.Context) arkv1alpha1.TokenUsage {
	collector, ok := ctx.Value(tokenCollectorKey).(eventing.TokenCollector)
	if !ok || collector == nil {
		return arkv1alpha1.TokenUsage{}
	}
	return collector.GetSummary()
}
