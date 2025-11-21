package trackers

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"

	"mckinsey.com/ark/internal/eventing"
)

type mcpServerTracker struct {
	emitter eventing.EventEmitter
}

func NewMCPServerTracker(emitter eventing.EventEmitter) eventing.MCPServerTracker {
	return &mcpServerTracker{
		emitter: emitter,
	}
}

func (t *mcpServerTracker) AddressResolutionFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "AddressResolutionFailed", reason)
}

func (t *mcpServerTracker) ClientCreationFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "ClientCreationFailed", reason)
}

func (t *mcpServerTracker) ToolListingFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "ToolListingFailed", reason)
}

func (t *mcpServerTracker) ToolCreationFailed(ctx context.Context, obj runtime.Object, reason string) {
	t.emitter.EmitWarning(ctx, obj, "ToolCreationFailed", reason)
}
