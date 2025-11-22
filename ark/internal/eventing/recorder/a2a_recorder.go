package recorder

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"

	"mckinsey.com/ark/internal/eventing"
)

type a2aRecorder struct {
	emitter eventing.EventEmitter
}

func NewA2aRecorder(emitter eventing.EventEmitter) eventing.A2aRecorder {
	return &a2aRecorder{
		emitter: emitter,
	}
}

func (t *a2aRecorder) AgentCreationFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "AgentCreationFailed", reason)
}

func (t *a2aRecorder) AgentDeletionFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "AgentDeletionFailed", reason)
}

func (t *a2aRecorder) TaskPollingFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "TaskPollingFailed", reason)
}
