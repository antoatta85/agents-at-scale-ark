package noop

import (
	"mckinsey.com/ark/internal/eventing"
	"mckinsey.com/ark/internal/eventing/recorder/tokens"
)

type noopQueryRecorder struct {
	tokens.TokenCollector
}

func NewQueryRecorder() eventing.QueryRecorder {
	return &noopQueryRecorder{
		TokenCollector: tokens.NewTokenCollector(),
	}
}
