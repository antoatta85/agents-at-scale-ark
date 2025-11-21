package trackers

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"

	"mckinsey.com/ark/internal/eventing"
)

type a2aTracker struct {
	emitter eventing.EventEmitter
}

func NewA2aTracker(emitter eventing.EventEmitter) eventing.A2aTracker {
	return &a2aTracker{
		emitter: emitter,
	}
}

func (t *a2aTracker) AgentCreationFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "AgentCreationFailed", reason)
}

func (t *a2aTracker) AgentDeletionFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "AgentDeletionFailed", reason)
}

func (t *a2aTracker) TaskPollingFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "TaskPollingFailed", reason)
}
