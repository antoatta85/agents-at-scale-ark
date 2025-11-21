package kubernetes

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"

	"mckinsey.com/ark/internal/eventing"
)

type KubernetesEventEmitter struct {
	recorder record.EventRecorder
}

func NewKubernetesEventEmitter(recorder record.EventRecorder) eventing.EventEmitter {
	return &KubernetesEventEmitter{
		recorder: recorder,
	}
}

func (e *KubernetesEventEmitter) EmitNormal(ctx context.Context, obj runtime.Object, reason, message string) {
	e.recorder.Event(obj, "Normal", reason, message)
}

func (e *KubernetesEventEmitter) EmitWarning(ctx context.Context, obj runtime.Object, reason, message string) {
	e.recorder.Event(obj, "Warning", reason, message)
}
