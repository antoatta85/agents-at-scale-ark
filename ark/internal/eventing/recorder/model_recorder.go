package recorder

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"

	"mckinsey.com/ark/internal/eventing"
	"mckinsey.com/ark/internal/eventing/recorder/operations"
)

type modelRecorder struct {
	emitter eventing.EventEmitter
	operations.OperationTracker
}

func NewModelRecorder(emitter eventing.EventEmitter) eventing.ModelRecorder {
	return &modelRecorder{
		emitter:          emitter,
		OperationTracker: operations.NewOperationTracker(emitter),
	}
}

func (t *modelRecorder) ModelUnavailable(ctx context.Context, model runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, model, "ModelUnavailable", reason)
}
