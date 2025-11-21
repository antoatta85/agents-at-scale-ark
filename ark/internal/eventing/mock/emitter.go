package mock

import (
	"context"
	"sync"

	"k8s.io/apimachinery/pkg/runtime"

	"mckinsey.com/ark/internal/eventing"
)

type Event struct {
	Type    string
	Reason  string
	Message string
	Object  runtime.Object
}

type MockEventEmitter struct {
	mu     sync.RWMutex
	events []Event
}

func NewMockEventEmitter() *MockEventEmitter {
	return &MockEventEmitter{
		events: make([]Event, 0),
	}
}

func (e *MockEventEmitter) EmitNormal(ctx context.Context, obj runtime.Object, reason, message string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.events = append(e.events, Event{
		Type:    "Normal",
		Reason:  reason,
		Message: message,
		Object:  obj,
	})
}

func (e *MockEventEmitter) EmitWarning(ctx context.Context, obj runtime.Object, reason, message string) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.events = append(e.events, Event{
		Type:    "Warning",
		Reason:  reason,
		Message: message,
		Object:  obj,
	})
}

func (e *MockEventEmitter) GetEvents() []Event {
	e.mu.RLock()
	defer e.mu.RUnlock()
	result := make([]Event, len(e.events))
	copy(result, e.events)
	return result
}

func (e *MockEventEmitter) Clear() {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.events = make([]Event, 0)
}

func (e *MockEventEmitter) EventCount() int {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return len(e.events)
}

var _ eventing.EventEmitter = (*MockEventEmitter)(nil)
