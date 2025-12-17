/* Copyright 2025. McKinsey & Company */

package controller

import (
	"context"
	"fmt"
	"regexp"
	"strings"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/labels"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
	"mckinsey.com/ark/internal/annotations"
	"mckinsey.com/ark/internal/common"
)

// EvaluatorReconciler reconciles an Evaluator object
type EvaluatorReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	resolver *common.ValueSourceResolver
}

// +kubebuilder:rbac:groups=ark.mckinsey.com,resources=evaluators,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=ark.mckinsey.com,resources=evaluators/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=ark.mckinsey.com,resources=evaluators/finalizers,verbs=update
// +kubebuilder:rbac:groups=ark.mckinsey.com,resources=queries,verbs=get;list;watch
// +kubebuilder:rbac:groups=ark.mckinsey.com,resources=evaluations,verbs=get;list;watch;create;update;patch
// +kubebuilder:rbac:groups="",resources=events,verbs=create;patch
// +kubebuilder:rbac:groups="",resources=secrets,verbs=get;list;watch
// +kubebuilder:rbac:groups="",resources=configmaps,verbs=get;list;watch
// +kubebuilder:rbac:groups="",resources=services,verbs=get;list;watch

func (r *EvaluatorReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := logf.FromContext(ctx)

	var evaluator arkv1alpha1.Evaluator
	if err := r.Get(ctx, req.NamespacedName, &evaluator); err != nil {
		if errors.IsNotFound(err) {
			log.Info("Evaluator deleted", "evaluator", req.Name)
			return ctrl.Result{}, nil
		}
		log.Error(err, "unable to fetch Evaluator")
		return ctrl.Result{}, err
	}

	// State machine approach following Memory pattern
	switch evaluator.Status.Phase {
	case statusReady:
		// For ready evaluators with selectors, process selector logic
		if evaluator.Spec.Selector != nil {
			if err := r.processEvaluatorWithSelector(ctx, &evaluator); err != nil {
				log.Error(err, "failed to process evaluator selector in ready state", "evaluator", evaluator.Name)
				return ctrl.Result{}, err
			}
		}
		return ctrl.Result{}, nil
	case statusError:
		// Terminal error state - no further processing needed
		return ctrl.Result{}, nil
	case statusRunning:
		// Continue processing
		return r.processEvaluator(ctx, &evaluator)
	default:
		// Initialize to running state
		if err := r.updateStatusAtomic(ctx, req.NamespacedName, func(e *arkv1alpha1.Evaluator) {
			e.Status.Phase = statusRunning
			e.Status.Message = "Resolving evaluator address"
		}); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}
}

func (r *EvaluatorReconciler) getResolver() *common.ValueSourceResolver {
	if r.resolver == nil {
		r.resolver = common.NewValueSourceResolver(r.Client)
	}
	return r.resolver
}

func (r *EvaluatorReconciler) processEvaluator(ctx context.Context, evaluator *arkv1alpha1.Evaluator) (ctrl.Result, error) {
	log := logf.FromContext(ctx)
	log.Info("Processing evaluator", "evaluator", evaluator.Name)

	// First, resolve the evaluator address
	resolver := r.getResolver()
	resolvedAddress, err := resolver.ResolveValueSource(ctx, evaluator.Spec.Address, evaluator.Namespace)
	if err != nil {
		log.Error(err, "failed to resolve Evaluator address", "evaluator", evaluator.Name)
		// Atomic update for error state
		if err := r.updateStatusAtomic(ctx, client.ObjectKeyFromObject(evaluator), func(e *arkv1alpha1.Evaluator) {
			e.Status.Phase = statusError
			e.Status.Message = fmt.Sprintf("Failed to resolve address: %v", err)
			e.Status.LastResolvedAddress = "" // Clear on error
		}); err != nil {
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	// If evaluator has selector, process matching queries
	if evaluator.Spec.Selector != nil {
		if err := r.processEvaluatorWithSelector(ctx, evaluator); err != nil {
			log.Error(err, "failed to process evaluator with selector", "evaluator", evaluator.Name)
			// Atomic update for error state
			if err := r.updateStatusAtomic(ctx, client.ObjectKeyFromObject(evaluator), func(e *arkv1alpha1.Evaluator) {
				e.Status.Phase = statusError
				e.Status.Message = fmt.Sprintf("Failed to process selector: %v", err)
				e.Status.LastResolvedAddress = resolvedAddress // Keep resolved address
			}); err != nil {
				return ctrl.Result{}, err
			}
			return ctrl.Result{}, nil
		}
	}

	// Mark as ready - atomic update with all fields
	if err := r.updateStatusAtomic(ctx, client.ObjectKeyFromObject(evaluator), func(e *arkv1alpha1.Evaluator) {
		e.Status.Phase = statusReady
		e.Status.Message = "Evaluator address resolved successfully"
		e.Status.LastResolvedAddress = resolvedAddress
	}); err != nil {
		return ctrl.Result{}, err
	}

	log.Info("Evaluator processed successfully", "evaluator", evaluator.Name, "resolvedAddress", resolvedAddress)
	return ctrl.Result{}, nil
}

// updateStatusAtomic performs atomic status updates with retry on conflict
func (r *EvaluatorReconciler) updateStatusAtomic(ctx context.Context, namespacedName types.NamespacedName, updateFn func(*arkv1alpha1.Evaluator)) error {
	log := logf.FromContext(ctx)

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		// Get fresh copy
		var evaluator arkv1alpha1.Evaluator
		if err := r.Get(ctx, namespacedName, &evaluator); err != nil {
			return err
		}

		// Apply updates
		updateFn(&evaluator)

		// Update status
		if err := r.Status().Update(ctx, &evaluator); err != nil {
			log.V(1).Info("failed to update Evaluator status (will retry)", "evaluator", evaluator.Name, "error", err)
			return err
		}

		log.Info("Updated Evaluator status", "evaluator", evaluator.Name,
			"phase", evaluator.Status.Phase, "message", evaluator.Status.Message)
		return nil
	})
}

// SetupWithManager sets up the controller with the Manager.
func (r *EvaluatorReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&arkv1alpha1.Evaluator{}).
		Watches(&arkv1alpha1.Query{}, handler.EnqueueRequestsFromMapFunc(r.findEvaluatorsForQuery)).
		Named("evaluator").
		Complete(r)
}

// resolveEvaluatorParameters resolves evaluator parameters from various sources
func (r *EvaluatorReconciler) resolveEvaluatorParameters(ctx context.Context, params []arkv1alpha1.Parameter, namespace string) ([]arkv1alpha1.Parameter, error) {
	resolved := make([]arkv1alpha1.Parameter, 0, len(params))

	for _, param := range params {
		resolvedParam := arkv1alpha1.Parameter{Name: param.Name}

		if param.Value != "" {
			resolvedParam.Value = param.Value
		} else if param.ValueFrom != nil {
			value, err := r.resolveParameterValue(ctx, param.ValueFrom, namespace)
			if err != nil {
				return nil, fmt.Errorf("failed to resolve parameter %s: %w", param.Name, err)
			}
			resolvedParam.Value = value
		}

		resolved = append(resolved, resolvedParam)
	}

	return resolved, nil
}

// resolveParameterValue resolves a parameter value from ConfigMap sources
func (r *EvaluatorReconciler) resolveParameterValue(ctx context.Context, valueFrom *arkv1alpha1.ValueFromSource, namespace string) (string, error) {
	if valueFrom.ConfigMapKeyRef != nil {
		return r.resolveConfigMapKeyRef(ctx, valueFrom.ConfigMapKeyRef, namespace)
	}

	if valueFrom.SecretKeyRef != nil {
		return r.resolveSecretKeyRef(ctx, valueFrom.SecretKeyRef, namespace)
	}

	return "", fmt.Errorf("no valid value source specified")
}

// resolveConfigMapKeyRef resolves a value from a specific ConfigMap key
func (r *EvaluatorReconciler) resolveConfigMapKeyRef(ctx context.Context, keyRef *corev1.ConfigMapKeySelector, namespace string) (string, error) {
	var configMap corev1.ConfigMap
	configMapKey := client.ObjectKey{
		Name:      keyRef.Name,
		Namespace: namespace,
	}

	if err := r.Get(ctx, configMapKey, &configMap); err != nil {
		if keyRef.Optional != nil && *keyRef.Optional {
			return "", nil
		}
		return "", fmt.Errorf("failed to get ConfigMap %s: %w", keyRef.Name, err)
	}

	value, exists := configMap.Data[keyRef.Key]
	if !exists {
		if keyRef.Optional != nil && *keyRef.Optional {
			return "", nil
		}
		return "", fmt.Errorf("key %s not found in ConfigMap %s", keyRef.Key, keyRef.Name)
	}

	return value, nil
}

// resolveSecretKeyRef resolves a value from a specific Secret key
func (r *EvaluatorReconciler) resolveSecretKeyRef(ctx context.Context, keyRef *corev1.SecretKeySelector, namespace string) (string, error) {
	var secret corev1.Secret
	secretKey := client.ObjectKey{
		Name:      keyRef.Name,
		Namespace: namespace,
	}

	if err := r.Get(ctx, secretKey, &secret); err != nil {
		return "", fmt.Errorf("failed to get Secret %s/%s: %w", namespace, keyRef.Name, err)
	}

	value, exists := secret.Data[keyRef.Key]
	if !exists {
		return "", fmt.Errorf("key '%s' not found in Secret %s/%s", keyRef.Key, namespace, keyRef.Name)
	}

	return string(value), nil
}

// findEvaluatorsForQuery maps query changes to evaluator reconcile requests
func (r *EvaluatorReconciler) findEvaluatorsForQuery(ctx context.Context, obj client.Object) []reconcile.Request {
	query := obj.(*arkv1alpha1.Query)
	var evaluators arkv1alpha1.EvaluatorList

	if err := r.List(ctx, &evaluators, client.InNamespace(query.Namespace)); err != nil {
		return nil
	}

	var requests []reconcile.Request
	for _, evaluator := range evaluators.Items {
		if r.queryMatchesEvaluator(query, &evaluator) {
			requests = append(requests, reconcile.Request{
				NamespacedName: types.NamespacedName{
					Name:      evaluator.Name,
					Namespace: evaluator.Namespace,
				},
			})
		}
	}
	return requests
}

// queryMatchesEvaluator checks if a query matches an evaluator's selector
func (r *EvaluatorReconciler) queryMatchesEvaluator(query *arkv1alpha1.Query, evaluator *arkv1alpha1.Evaluator) bool {
	if evaluator.Spec.Selector == nil {
		return false
	}

	selector := evaluator.Spec.Selector

	// Check resource type
	if selector.ResourceType != "Query" {
		return false
	}

	// Build label selector
	labelSelector := &metav1.LabelSelector{
		MatchLabels:      selector.MatchLabels,
		MatchExpressions: selector.MatchExpressions,
	}

	selectorObj, err := metav1.LabelSelectorAsSelector(labelSelector)
	if err != nil {
		return false
	}

	return selectorObj.Matches(labels.Set(query.Labels))
}

// processEvaluatorWithSelector handles selector-based evaluation logic
func (r *EvaluatorReconciler) processEvaluatorWithSelector(ctx context.Context, evaluator *arkv1alpha1.Evaluator) error {
	matchingQueries, err := r.findMatchingQueries(ctx, evaluator)
	if err != nil {
		return fmt.Errorf("failed to find matching queries: %w", err)
	}

	var completedQueries []arkv1alpha1.Query
	for _, query := range matchingQueries {
		if query.Status.Phase == statusDone {
			completedQueries = append(completedQueries, query)
		}
	}

	if len(completedQueries) == 0 {
		return nil
	}

	evaluationMode := evaluator.Spec.EvaluationMode
	if evaluationMode == "" {
		evaluationMode = "individual"
	}

	switch evaluationMode {
	case "batch":
		return r.processBatchEvaluationMode(ctx, evaluator, completedQueries)
	default:
		return r.processIndividualEvaluationMode(ctx, evaluator, completedQueries)
	}
}

// processIndividualEvaluationMode creates one evaluation per query
func (r *EvaluatorReconciler) processIndividualEvaluationMode(ctx context.Context, evaluator *arkv1alpha1.Evaluator, queries []arkv1alpha1.Query) error {
	log := logf.FromContext(ctx)

	for _, query := range queries {
		if err := r.createEvaluationForQuery(ctx, evaluator, &query); err != nil {
			log.Error(err, "Failed to create evaluation for query",
				"evaluator", evaluator.Name,
				"query", query.Name)
			continue
		}
	}

	return nil
}

// processBatchEvaluationMode creates or updates batch evaluation(s)
func (r *EvaluatorReconciler) processBatchEvaluationMode(ctx context.Context, evaluator *arkv1alpha1.Evaluator, queries []arkv1alpha1.Query) error {
	log := logf.FromContext(ctx)
	batchConfig := evaluator.Spec.BatchConfig

	if batchConfig == nil {
		return fmt.Errorf("batchConfig is required when evaluationMode=batch")
	}

	queryGroups := r.groupQueries(queries, batchConfig)

	for groupKey, groupQueries := range queryGroups {
		batchName := r.determineBatchName(evaluator.Name, batchConfig, groupKey)

		var existingBatch arkv1alpha1.Evaluation
		err := r.Get(ctx, client.ObjectKey{
			Name:      batchName,
			Namespace: evaluator.Namespace,
		}, &existingBatch)

		if err != nil && !errors.IsNotFound(err) {
			log.Error(err, "Failed to check existing batch", "batch", batchName)
			continue
		}

		batchExists := err == nil

		switch batchConfig.UpdateMode {
		case "immutable":
			if batchExists {
				log.Info("Batch already exists (immutable mode)", "batch", batchName)
				continue
			}
			if err := r.createBatchEvaluation(ctx, evaluator, groupQueries, batchName); err != nil {
				log.Error(err, "Failed to create batch", "batch", batchName)
			}

		case "dynamic":
			if !batchExists {
				if err := r.createBatchEvaluation(ctx, evaluator, groupQueries, batchName); err != nil {
					log.Error(err, "Failed to create batch", "batch", batchName)
				}
			} else {
				if err := r.updateBatchEvaluation(ctx, groupQueries, &existingBatch); err != nil {
					log.Error(err, "Failed to update batch", "batch", batchName)
				}
			}

		default:
			return fmt.Errorf("invalid updateMode: %s", batchConfig.UpdateMode)
		}
	}

	return nil
}

// groupQueries groups queries by label or annotation if configured
func (r *EvaluatorReconciler) groupQueries(queries []arkv1alpha1.Query, batchConfig *arkv1alpha1.EvaluatorBatchConfig) map[string][]arkv1alpha1.Query {
	groups := make(map[string][]arkv1alpha1.Query)

	var groupByType, groupByKey string
	if batchConfig.GroupByLabel != "" {
		groupByType = "label"
		groupByKey = batchConfig.GroupByLabel
	} else if batchConfig.GroupByAnnotation != "" {
		groupByType = "annotation"
		groupByKey = batchConfig.GroupByAnnotation
	}

	if groupByKey == "" {
		groups[""] = queries
		return groups
	}

	for _, query := range queries {
		var groupValue string
		if groupByType == "label" {
			groupValue = query.Labels[groupByKey]
		} else {
			groupValue = query.Annotations[groupByKey]
		}

		if groupValue == "" {
			continue
		}

		groups[groupValue] = append(groups[groupValue], query)
	}

	return groups
}

// determineBatchName generates batch evaluation name
func (r *EvaluatorReconciler) determineBatchName(evaluatorName string, batchConfig *arkv1alpha1.EvaluatorBatchConfig, groupValue string) string {
	if groupValue != "" {
		sanitized := r.sanitizeName(groupValue)
		return fmt.Sprintf("%s-batch-%s", evaluatorName, sanitized)
	}

	if batchConfig.Name != "" {
		return batchConfig.Name
	}

	return fmt.Sprintf("%s-batch", evaluatorName)
}

// sanitizeName sanitizes a value for use in Kubernetes resource names
func (r *EvaluatorReconciler) sanitizeName(value string) string {
	sanitized := strings.ToLower(value)

	reg := regexp.MustCompile(`[^a-z0-9.-]`)
	sanitized = reg.ReplaceAllString(sanitized, "-")

	sanitized = strings.Trim(sanitized, "-.")

	if len(sanitized) > 63 {
		sanitized = sanitized[:63]
	}

	return sanitized
}

// createBatchEvaluation creates a new batch evaluation
func (r *EvaluatorReconciler) createBatchEvaluation(ctx context.Context, evaluator *arkv1alpha1.Evaluator, queries []arkv1alpha1.Query, batchName string) error {
	log := logf.FromContext(ctx)
	batchConfig := evaluator.Spec.BatchConfig

	items := make([]arkv1alpha1.BatchEvaluationItem, 0, len(queries))
	for _, query := range queries {
		items = append(items, arkv1alpha1.BatchEvaluationItem{
			Name: fmt.Sprintf("%s-%s", batchName, query.Name),
			Type: "query",
			Config: arkv1alpha1.EvaluationConfig{
				QueryBasedEvaluationConfig: &arkv1alpha1.QueryBasedEvaluationConfig{
					QueryRef: &arkv1alpha1.QueryRef{
						Name:      query.Name,
						Namespace: query.Namespace,
					},
				},
			},
			Evaluator: arkv1alpha1.EvaluationEvaluatorRef{
				Name:      evaluator.Name,
				Namespace: evaluator.Namespace,
			},
		})
	}

	concurrency := 10
	if batchConfig.Concurrency > 0 {
		concurrency = batchConfig.Concurrency
	}

	continueOnFailure := true
	if !batchConfig.ContinueOnFailure {
		continueOnFailure = batchConfig.ContinueOnFailure
	}

	batch := &arkv1alpha1.Evaluation{
		ObjectMeta: metav1.ObjectMeta{
			Name:      batchName,
			Namespace: evaluator.Namespace,
			Labels: map[string]string{
				"ark.mckinsey.com/evaluator":   evaluator.Name,
				"ark.mckinsey.com/batch-mode":  "selector",
				"ark.mckinsey.com/update-mode": batchConfig.UpdateMode,
			},
			Annotations: map[string]string{
				"ark.mckinsey.com/query-count": fmt.Sprintf("%d", len(queries)),
				"ark.mckinsey.com/created-at":  time.Now().Format(time.RFC3339),
			},
			OwnerReferences: []metav1.OwnerReference{
				{
					APIVersion: evaluator.APIVersion,
					Kind:       evaluator.Kind,
					Name:       evaluator.Name,
					UID:        evaluator.UID,
				},
			},
		},
		Spec: arkv1alpha1.EvaluationSpec{
			Type: "batch",
			Config: arkv1alpha1.EvaluationConfig{
				BatchEvaluationConfig: &arkv1alpha1.BatchEvaluationConfig{
					Items:             items,
					Concurrency:       int32(concurrency),
					ContinueOnFailure: continueOnFailure,
				},
			},
			Evaluator: arkv1alpha1.EvaluationEvaluatorRef{
				Name:      evaluator.Name,
				Namespace: evaluator.Namespace,
			},
		},
	}

	if err := r.Create(ctx, batch); err != nil {
		return fmt.Errorf("failed to create batch evaluation: %w", err)
	}

	log.Info("Created batch evaluation",
		"batch", batchName,
		"evaluator", evaluator.Name,
		"queryCount", len(queries))

	return nil
}

// updateBatchEvaluation updates existing batch with new queries (dynamic mode)
func (r *EvaluatorReconciler) updateBatchEvaluation(ctx context.Context, queries []arkv1alpha1.Query, existingBatch *arkv1alpha1.Evaluation) error {
	log := logf.FromContext(ctx)

	if existingBatch.Spec.Config.BatchEvaluationConfig == nil {
		return fmt.Errorf("existing batch has no batch config")
	}

	existingQueryNames := make(map[string]bool)
	for _, item := range existingBatch.Spec.Config.Items {
		if item.Config.QueryBasedEvaluationConfig != nil {
			queryName := item.Config.QueryRef.Name
			existingQueryNames[queryName] = true
		}
	}

	var newQueries []arkv1alpha1.Query
	for _, query := range queries {
		if !existingQueryNames[query.Name] {
			newQueries = append(newQueries, query)
		}
	}

	if len(newQueries) == 0 {
		log.Info("No new queries to add to batch", "batch", existingBatch.Name)
		return nil
	}

	for _, query := range newQueries {
		newItem := arkv1alpha1.BatchEvaluationItem{
			Name: fmt.Sprintf("%s-%s", existingBatch.Name, query.Name),
			Type: "query",
			Config: arkv1alpha1.EvaluationConfig{
				QueryBasedEvaluationConfig: &arkv1alpha1.QueryBasedEvaluationConfig{
					QueryRef: &arkv1alpha1.QueryRef{
						Name:      query.Name,
						Namespace: query.Namespace,
					},
				},
			},
			Evaluator: existingBatch.Spec.Evaluator,
		}
		existingBatch.Spec.Config.Items = append(
			existingBatch.Spec.Config.Items,
			newItem,
		)
	}

	totalCount := len(existingBatch.Spec.Config.Items)
	if existingBatch.Annotations == nil {
		existingBatch.Annotations = make(map[string]string)
	}
	existingBatch.Annotations["ark.mckinsey.com/query-count"] = fmt.Sprintf("%d", totalCount)
	existingBatch.Annotations["ark.mckinsey.com/updated-at"] = time.Now().Format(time.RFC3339)

	if err := r.Update(ctx, existingBatch); err != nil {
		return fmt.Errorf("failed to update batch evaluation: %w", err)
	}

	log.Info("Updated batch evaluation with new queries",
		"batch", existingBatch.Name,
		"newQueries", len(newQueries),
		"totalQueries", totalCount)

	return nil
}

// findMatchingQueries finds queries that match the evaluator's selector
func (r *EvaluatorReconciler) findMatchingQueries(ctx context.Context, evaluator *arkv1alpha1.Evaluator) ([]arkv1alpha1.Query, error) {
	selector := evaluator.Spec.Selector

	// Build label selector
	labelSelector := &metav1.LabelSelector{
		MatchLabels:      selector.MatchLabels,
		MatchExpressions: selector.MatchExpressions,
	}

	selectorObj, err := metav1.LabelSelectorAsSelector(labelSelector)
	if err != nil {
		return nil, err
	}

	var queries arkv1alpha1.QueryList
	opts := &client.ListOptions{
		Namespace:     evaluator.Namespace,
		LabelSelector: selectorObj,
	}

	if err := r.List(ctx, &queries, opts); err != nil {
		return nil, err
	}

	filteredQueries := r.filterQueriesByAge(queries.Items, evaluator)
	return filteredQueries, nil
}

// filterQueriesByAge filters queries based on evaluator's queryAgeFilter setting
func (r *EvaluatorReconciler) filterQueriesByAge(queries []arkv1alpha1.Query, evaluator *arkv1alpha1.Evaluator) []arkv1alpha1.Query {
	if evaluator.Spec.QueryAgeFilter == "" || evaluator.Spec.QueryAgeFilter == "all" {
		return queries
	}

	var cutoffTime time.Time
	switch evaluator.Spec.QueryAgeFilter {
	case "afterEvaluator":
		cutoffTime = evaluator.CreationTimestamp.Time
	case "afterTimestamp":
		if evaluator.Spec.CreatedAfter != nil {
			cutoffTime = evaluator.Spec.CreatedAfter.Time
		} else {
			return queries
		}
	default:
		return queries
	}

	filtered := make([]arkv1alpha1.Query, 0)
	for _, query := range queries {
		if query.CreationTimestamp.After(cutoffTime) {
			filtered = append(filtered, query)
		}
	}

	return filtered
}

// mergeEvaluationMetadata merges query metadata (labels and annotations) into evaluation metadata
func (r *EvaluatorReconciler) mergeEvaluationMetadata(query *arkv1alpha1.Query, evaluator *arkv1alpha1.Evaluator) (map[string]string, map[string]string) {
	// Merge labels: copy all labels from query, then set required labels (these take precedence)
	evaluationLabels := make(map[string]string)
	if query.Labels != nil {
		for k, v := range query.Labels {
			evaluationLabels[k] = v
		}
	}
	// Required labels take precedence
	evaluationLabels[annotations.Evaluator] = evaluator.Name
	evaluationLabels[annotations.Query] = query.Name
	evaluationLabels[annotations.Auto] = "true"

	// Merge annotations: copy all annotations from query, then set required annotations (these take precedence)
	annotationsMap := make(map[string]string)
	if query.Annotations != nil {
		for k, v := range query.Annotations {
			annotationsMap[k] = v
		}
	}

	// Required annotations take precedence
	annotationsMap[annotations.QueryGeneration] = fmt.Sprintf("%d", query.Generation)
	annotationsMap[annotations.QueryPhase] = query.Status.Phase

	return evaluationLabels, annotationsMap
}

// createEvaluationForQuery creates an evaluation for a specific query
func (r *EvaluatorReconciler) createEvaluationForQuery(ctx context.Context, evaluator *arkv1alpha1.Evaluator, query *arkv1alpha1.Query) error {
	log := logf.FromContext(ctx)

	// Check if evaluation already exists
	evaluationName := fmt.Sprintf("%s-%s-eval", evaluator.Name, query.Name)

	var existingEval arkv1alpha1.Evaluation
	evalKey := client.ObjectKey{Name: evaluationName, Namespace: evaluator.Namespace}

	if err := r.Get(ctx, evalKey, &existingEval); err == nil {
		// Evaluation exists, check if query changed
		if r.shouldRetriggerEvaluation(&existingEval, query) {
			return r.updateEvaluationForQuery(ctx, &existingEval, evaluator, query)
		}
		log.Info("Evaluation already exists and is up to date", "evaluation", evaluationName)
		return nil // Already evaluated
	}

	// Resolve parameters
	parameters, err := r.resolveEvaluatorParameters(ctx, evaluator.Spec.Parameters, evaluator.Namespace)
	if err != nil {
		return fmt.Errorf("failed to resolve parameters: %w", err)
	}

	// Merge query metadata into evaluation metadata
	evaluationLabels, annotationsMap := r.mergeEvaluationMetadata(query, evaluator)

	// Create new evaluation
	evaluation := &arkv1alpha1.Evaluation{
		ObjectMeta: metav1.ObjectMeta{
			Name:        evaluationName,
			Namespace:   evaluator.Namespace,
			Labels:      evaluationLabels,
			Annotations: annotationsMap,
		},
		Spec: arkv1alpha1.EvaluationSpec{
			Type: "query",
			Config: arkv1alpha1.EvaluationConfig{
				QueryBasedEvaluationConfig: &arkv1alpha1.QueryBasedEvaluationConfig{
					QueryRef: &arkv1alpha1.QueryRef{
						Name:           query.Name,
						Namespace:      query.Namespace,
						ResponseTarget: "", // Default to first response
					},
				},
			},
			Evaluator: arkv1alpha1.EvaluationEvaluatorRef{
				Name:       evaluator.Name,
				Namespace:  evaluator.Namespace,
				Parameters: parameters,
			},
		},
	}

	log.Info("Creating evaluation for query", "evaluation", evaluationName, "query", query.Name)
	return r.Create(ctx, evaluation)
}

// shouldRetriggerEvaluation checks if evaluation should be retriggered based on query changes
func (r *EvaluatorReconciler) shouldRetriggerEvaluation(evaluation *arkv1alpha1.Evaluation, query *arkv1alpha1.Query) bool {
	// Check if query generation has changed
	currentGeneration := fmt.Sprintf("%d", query.Generation)
	lastGeneration := evaluation.Annotations[annotations.QueryGeneration]

	if currentGeneration != lastGeneration {
		return true
	}

	// Check if query phase has changed to "done"
	currentPhase := query.Status.Phase
	lastPhase := evaluation.Annotations[annotations.QueryPhase]

	return currentPhase == "done" && currentPhase != lastPhase
}

// updateEvaluationForQuery updates an existing evaluation to retrigger evaluation
func (r *EvaluatorReconciler) updateEvaluationForQuery(ctx context.Context, evaluation *arkv1alpha1.Evaluation, evaluator *arkv1alpha1.Evaluator, query *arkv1alpha1.Query) error {
	log := logf.FromContext(ctx)

	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		// Get fresh copy
		var currentEval arkv1alpha1.Evaluation
		evalKey := client.ObjectKeyFromObject(evaluation)
		if err := r.Get(ctx, evalKey, &currentEval); err != nil {
			return err
		}

		// Update metadata to inherit from query
		currentEval.Labels, currentEval.Annotations = r.mergeEvaluationMetadata(query, evaluator)

		// Resolve and update parameters
		parameters, err := r.resolveEvaluatorParameters(ctx, evaluator.Spec.Parameters, evaluator.Namespace)
		if err != nil {
			return fmt.Errorf("failed to resolve parameters: %w", err)
		}
		currentEval.Spec.Evaluator.Parameters = parameters

		// Update main object first
		if err := r.Update(ctx, &currentEval); err != nil {
			return err
		}

		// Then atomically reset status to trigger re-evaluation
		currentEval.Status = arkv1alpha1.EvaluationStatus{
			Phase:   "",
			Message: "",
			Score:   "",
			Passed:  false,
		}

		if err := r.Status().Update(ctx, &currentEval); err != nil {
			return err
		}

		log.Info("Updated evaluation for retriggering", "evaluation", currentEval.Name, "query", query.Name)
		return nil
	})
}
