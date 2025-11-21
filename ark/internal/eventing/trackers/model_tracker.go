package trackers

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"

	"mckinsey.com/ark/internal/eventing"
)

type modelTracker struct {
	emitter eventing.EventEmitter
}

func NewModelTracker(emitter eventing.EventEmitter) eventing.ModelTracker {
	return &modelTracker{
		emitter: emitter,
	}
}

func (t *modelTracker) RecordModelCreated(ctx context.Context, model runtime.Object) {
	t.emitter.EmitNormal(ctx, model, "ModelCreated", "Model has been created")
}

func (t *modelTracker) RecordModelAvailable(ctx context.Context, model runtime.Object) {
	t.emitter.EmitNormal(ctx, model, "ModelAvailable", "Model is available and responding to probes")
}

func (t *modelTracker) RecordModelUnavailable(ctx context.Context, model runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, model, "ModelUnavailable", reason)
}
