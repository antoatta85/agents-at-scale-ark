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

func (t *modelTracker) ModelUnavailable(ctx context.Context, model runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, model, "ModelUnavailable", reason)
}
