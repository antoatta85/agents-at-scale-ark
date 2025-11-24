package operations

import (
	"context"

	corev1 "k8s.io/api/core/v1"
	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
	"mckinsey.com/ark/internal/eventing"
)

type (
	queryDetailsKeyType     struct{}
	operationDetailsKeyType struct{}
)

var (
	queryDetailsKey     = queryDetailsKeyType{}
	operationDetailsKey = operationDetailsKeyType{}
)

type QueryDetails struct {
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

	qd := &QueryDetails{
		Query:     query,
		QueryID:   string(query.UID),
		QueryName: query.Name,
		Namespace: query.Namespace,
		SessionID: sessionID,
	}

	return context.WithValue(ctx, queryDetailsKey, qd)
}

func (ot *OperationTracker) GetQueryDetails(ctx context.Context) *QueryDetails {
	if v := ctx.Value(queryDetailsKey); v != nil {
		if qd, ok := v.(*QueryDetails); ok {
			return qd
		}
	}
	return nil
}

func (ot *OperationTracker) getOperationDetails(ctx context.Context) map[string]string {
	if v := ctx.Value(operationDetailsKey); v != nil {
		if metadata, ok := v.(map[string]string); ok {
			return metadata
		}
	}
	return nil
}

func (ot *OperationTracker) buildOperationData(ctx context.Context, additionalData map[string]string) (map[string]string, *arkv1alpha1.Query) {
	result := make(map[string]string)

	qd := ot.GetQueryDetails(ctx)
	if qd == nil {
		return result, nil
	}

	result["queryId"] = qd.QueryID
	result["queryName"] = qd.QueryName
	result["queryNamespace"] = qd.Namespace
	result["sessionId"] = qd.SessionID

	opDetails := ot.getOperationDetails(ctx)
	for k, v := range opDetails {
		result[k] = v
	}

	for k, v := range additionalData {
		result[k] = v
	}

	return result, qd.Query
}

func (ot *OperationTracker) Start(ctx context.Context, operation, message string, data map[string]string) context.Context {
	ctx = context.WithValue(ctx, operationDetailsKey, data)

	operationData, query := ot.buildOperationData(ctx, nil)
	if query == nil {
		return ctx
	}

	ot.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, operation+"Start", message, operationData)

	return ctx
}

func (ot *OperationTracker) Complete(ctx context.Context, operation, message string, data map[string]string) {
	operationData, query := ot.buildOperationData(ctx, data)
	if query == nil {
		return
	}

	ot.emitter.EmitStructured(ctx, query, corev1.EventTypeNormal, operation+"Complete", message, operationData)
}

func (ot *OperationTracker) Fail(ctx context.Context, operation, message string, err error, data map[string]string) {
	if data == nil {
		data = make(map[string]string)
	}
	data["error"] = err.Error()

	operationData, query := ot.buildOperationData(ctx, data)
	if query == nil {
		return
	}

	ot.emitter.EmitStructured(ctx, query, corev1.EventTypeWarning, operation+"Error", message, operationData)
}
