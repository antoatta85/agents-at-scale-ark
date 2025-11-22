package recorder

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"

	"mckinsey.com/ark/internal/eventing"
)

type agentRecorder struct {
	emitter eventing.EventEmitter
}

func NewAgentRecorder(emitter eventing.EventEmitter) eventing.AgentRecorder {
	return &agentRecorder{
		emitter: emitter,
	}
}

func (t *agentRecorder) DependencyUnavailable(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "DependencyUnavailable", reason)
}
