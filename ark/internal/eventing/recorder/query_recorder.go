package recorder

import (
	"mckinsey.com/ark/internal/eventing"
	"mckinsey.com/ark/internal/eventing/recorder/tokens"
)

type queryRecorder struct {
	tokens.TokenCollector
	emitter eventing.EventEmitter
}

func NewQueryRecorder(emitter eventing.EventEmitter) eventing.QueryRecorder {
	return &queryRecorder{
		TokenCollector: tokens.NewTokenCollector(),
		emitter:        emitter,
	}
}
