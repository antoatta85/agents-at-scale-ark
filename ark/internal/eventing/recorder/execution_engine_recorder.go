package recorder

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"

	"mckinsey.com/ark/internal/eventing"
)

type executionEngineRecorder struct {
	emitter eventing.EventEmitter
}

func NewExecutionEngineRecorder(emitter eventing.EventEmitter) eventing.ExecutionEngineRecorder {
	return &executionEngineRecorder{
		emitter: emitter,
	}
}

func (t *executionEngineRecorder) AddressResolutionFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "AddressResolutionFailed", reason)
}
