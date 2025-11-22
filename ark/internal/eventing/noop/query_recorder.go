package noop

import (
	"mckinsey.com/ark/internal/eventing"
	"mckinsey.com/ark/internal/eventing/recorder/operations"
	"mckinsey.com/ark/internal/eventing/recorder/tokens"
)

type noopQueryRecorder struct {
	tokens.TokenCollector
	operations.OperationTracker
}

func NewQueryRecorder() eventing.QueryRecorder {
	emitter := NewNoopEventEmitter()
	return &noopQueryRecorder{
		TokenCollector:   tokens.NewTokenCollector(),
		OperationTracker: operations.NewOperationTracker(emitter),
	}
}
