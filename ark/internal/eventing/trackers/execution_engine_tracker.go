package trackers

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"

	"mckinsey.com/ark/internal/eventing"
)

type executionEngineTracker struct {
	emitter eventing.EventEmitter
}

func NewExecutionEngineTracker(emitter eventing.EventEmitter) eventing.ExecutionEngineTracker {
	return &executionEngineTracker{
		emitter: emitter,
	}
}

func (t *executionEngineTracker) AddressResolutionFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "AddressResolutionFailed", reason)
}
