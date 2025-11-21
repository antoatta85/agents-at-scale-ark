package eventing

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime"
)

type ModelTracker interface {
	RecordModelCreated(ctx context.Context, model runtime.Object)
	RecordModelAvailable(ctx context.Context, model runtime.Object)
	RecordModelUnavailable(ctx context.Context, model runtime.Object, reason string)
}

type Provider interface {
	ModelTracker() ModelTracker
}
