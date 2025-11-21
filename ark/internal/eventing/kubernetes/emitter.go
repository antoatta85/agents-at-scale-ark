package kubernetes

import (
	"context"
	"encoding/json"

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

func (e *KubernetesEventEmitter) EmitStructured(ctx context.Context, obj runtime.Object, eventType, reason, message string, data eventing.EventData) {
	jsonBytes, err := json.Marshal(data)
	if err != nil {
		e.recorder.Event(obj, eventType, reason, message)
		return
	}

	annotations := map[string]string{
		"ark.mckinsey.com/event-data": string(jsonBytes),
	}
	e.recorder.AnnotatedEventf(obj, annotations, eventType, reason, message)
}
