package operations

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
	"mckinsey.com/ark/internal/eventing"
)

type queryContextKeyType struct{}

var queryContextKey = queryContextKeyType{}

type QueryContext struct {
	Query     *arkv1alpha1.Query
	QueryID   string
	QueryName string
	Namespace string
	SessionID string
}

type OperationTracker struct {
	emitter eventing.EventEmitter
}

func NewOperationTracker(emitter eventing.EventEmitter) OperationTracker {
	return OperationTracker{
		emitter: emitter,
	}
}

func (ot *OperationTracker) InitializeQueryContext(ctx context.Context, query *arkv1alpha1.Query) context.Context {
	sessionID := query.Spec.SessionId
	if sessionID == "" {
		sessionID = string(query.UID)
	}

	qctx := &QueryContext{
		Query:     query,
		QueryID:   string(query.UID),
		QueryName: query.Name,
		Namespace: query.Namespace,
		SessionID: sessionID,
	}

	return context.WithValue(ctx, queryContextKey, qctx)
}

func (ot *OperationTracker) getQueryContext(ctx context.Context) *QueryContext {
	if v := ctx.Value(queryContextKey); v != nil {
		if qctx, ok := v.(*QueryContext); ok {
			return qctx
		}
	}
	return nil
}

func (ot *OperationTracker) buildOperationData(ctx context.Context, additionalData OperationData) OperationData {
	qctx := ot.getQueryContext(ctx)
	if qctx == nil {
		return additionalData
	}

	additionalData.QueryID = qctx.QueryID
	additionalData.QueryName = qctx.QueryName
	additionalData.QueryNamespace = qctx.Namespace
	additionalData.SessionID = qctx.SessionID

	return additionalData
}

func (ot *OperationTracker) Start(ctx context.Context, operation, message string, data OperationData) {
	qctx := ot.getQueryContext(ctx)
	if qctx == nil {
		return
	}

	operationData := ot.buildOperationData(ctx, data)
	ot.emitter.EmitStructured(ctx, qctx.Query, corev1.EventTypeNormal, operation+"Start", message, operationData)
}

func (ot *OperationTracker) Complete(ctx context.Context, operation, message string, data OperationData) {
	qctx := ot.getQueryContext(ctx)
	if qctx == nil {
		return
	}

	operationData := ot.buildOperationData(ctx, data)
	ot.emitter.EmitStructured(ctx, qctx.Query, corev1.EventTypeNormal, operation+"Complete", message, operationData)
}

func (ot *OperationTracker) Fail(ctx context.Context, operation, message string, err error, data OperationData) {
	qctx := ot.getQueryContext(ctx)
	if qctx == nil {
		return
	}

	data.ErrorMessage = err.Error()
	operationData := ot.buildOperationData(ctx, data)
	ot.emitter.EmitStructured(ctx, qctx.Query, corev1.EventTypeWarning, operation+"Error", message, operationData)
}
