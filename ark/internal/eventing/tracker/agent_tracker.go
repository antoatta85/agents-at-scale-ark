package trackers

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"

	"mckinsey.com/ark/internal/eventing"
)

type agentTracker struct {
	emitter eventing.EventEmitter
}

func NewAgentTracker(emitter eventing.EventEmitter) eventing.AgentTracker {
	return &agentTracker{
		emitter: emitter,
	}
}

func (t *agentTracker) DependencyUnavailable(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "DependencyUnavailable", reason)
}
