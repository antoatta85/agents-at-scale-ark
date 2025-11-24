package recorder

import (
	"context"
	"fmt"

	"k8s.io/apimachinery/pkg/runtime"

	"mckinsey.com/ark/internal/eventing"
	"mckinsey.com/ark/internal/eventing/recorder/operations"
	"mckinsey.com/ark/internal/eventing/recorder/tokens"
)

type queryRecorder struct {
	tokens.TokenCollector
	operations.OperationTracker
	emitter eventing.EventEmitter
}

func NewQueryRecorder(emitter eventing.EventEmitter) eventing.QueryRecorder {
	return &queryRecorder{
		TokenCollector:   tokens.NewTokenCollector(),
		OperationTracker: operations.NewOperationTracker(emitter),
		emitter:          emitter,
	}
}

func (qr *queryRecorder) Start(ctx context.Context, operation, message string, data map[string]string) context.Context {
	ctx = qr.StartTokenCollection(ctx)
	return qr.OperationTracker.Start(ctx, operation, message, data)
}

func (qr *queryRecorder) Complete(ctx context.Context, operation, message string, data map[string]string) {
	tokenUsage := qr.GetTokenSummary(ctx)
	if data == nil {
		data = make(map[string]string)
	}
	data["promptTokens"] = fmt.Sprintf("%d", tokenUsage.PromptTokens)
	data["completionTokens"] = fmt.Sprintf("%d", tokenUsage.CompletionTokens)
	data["totalTokens"] = fmt.Sprintf("%d", tokenUsage.TotalTokens)
	qr.OperationTracker.Complete(ctx, operation, message, data)
}

func (qr *queryRecorder) Fail(ctx context.Context, operation, message string, err error, data map[string]string) {
	tokenUsage := qr.GetTokenSummary(ctx)
	if data == nil {
		data = make(map[string]string)
	}
	data["promptTokens"] = fmt.Sprintf("%d", tokenUsage.PromptTokens)
	data["completionTokens"] = fmt.Sprintf("%d", tokenUsage.CompletionTokens)
	data["totalTokens"] = fmt.Sprintf("%d", tokenUsage.TotalTokens)
	qr.OperationTracker.Fail(ctx, operation, message, err, data)
}

func (qr *queryRecorder) QueryParameterResolutionFailed(ctx context.Context, obj runtime.Object, parameterName, reason string) {
	qr.emitter.EmitWarning(ctx, obj, "QueryParameterResolutionFailed", fmt.Sprintf("Failed to resolve parameter %s: %s", parameterName, reason))
}

func (qr *queryRecorder) QueryParameterNotFound(ctx context.Context, obj runtime.Object, parameterName string) {
	qr.emitter.EmitWarning(ctx, obj, "QueryParameterNotFound", fmt.Sprintf("Parameter not found: %s", parameterName))
}
