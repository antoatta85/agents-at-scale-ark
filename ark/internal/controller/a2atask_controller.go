/* Copyright 2025. McKinsey & Company */

package controller

import (
	"context"
	"crypto/sha256"
	"fmt"
	"slices"
	"strings"
	"time"

	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	logf "sigs.k8s.io/controller-runtime/pkg/log"
	a2aclient "trpc.group/trpc-go/trpc-a2a-go/client"
	"trpc.group/trpc-go/trpc-a2a-go/protocol"

	arkv1alpha1 "mckinsey.com/ark/api/v1alpha1"
	arkv1prealpha1 "mckinsey.com/ark/api/v1prealpha1"
	"mckinsey.com/ark/internal/genai"
)

const (
	statusAssigned  = "assigned"
	statusCompleted = "completed"
	statusFailed    = "failed"
	statusCancelled = "cancelled"
)

type A2ATaskReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	Recorder record.EventRecorder
}

// +kubebuilder:rbac:groups=ark.mckinsey.com,resources=a2atasks,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=ark.mckinsey.com,resources=a2atasks/finalizers,verbs=update
// +kubebuilder:rbac:groups=ark.mckinsey.com,resources=a2atasks/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=ark.mckinsey.com,resources=queries,verbs=get;list
// +kubebuilder:rbac:groups=ark.mckinsey.com,resources=agents,verbs=get;list

func (r *A2ATaskReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := logf.FromContext(ctx)

	var a2aTask arkv1alpha1.A2ATask
	if err := r.Get(ctx, req.NamespacedName, &a2aTask); err != nil {
		log.Error(err, "unable to fetch A2ATask")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// Initialize phase if not set
	if a2aTask.Status.Phase == "" {
		a2aTask.Status.Phase = statusPending
	}

	// Initialize Completed condition if not set
	if len(a2aTask.Status.Conditions) == 0 {
		r.setConditionCompleted(&a2aTask, metav1.ConditionFalse, "TaskNotStarted", "Task has not been started yet")
		return ctrl.Result{}, r.Status().Update(ctx, &a2aTask)
	}

	// Handle terminal states
	if isTerminalPhase(a2aTask.Status.Phase) {
		return ctrl.Result{}, nil
	}

	// Set start time for new tasks
	if a2aTask.Status.Phase == statusPending && a2aTask.Status.StartTime == nil {
		now := metav1.NewTime(time.Now())
		a2aTask.Status.StartTime = &now
		a2aTask.Status.Phase = statusAssigned

		r.Recorder.Event(&a2aTask, "Normal", "TaskStarted", "A2A task execution started")
	}

	// Poll task status from A2A server if we have the required information
	if a2aTask.Status.Phase == statusAssigned || a2aTask.Status.Phase == statusRunning {
		if err := r.pollA2ATaskStatus(ctx, &a2aTask); err != nil {
			log.Error(err, "failed to poll A2A task status", "taskId", a2aTask.Spec.TaskID)
			r.Recorder.Event(&a2aTask, "Warning", "TaskPollingFailed", fmt.Sprintf("Failed to poll task status: %v", err))

			// Continue with requeue even on error to retry polling
		}
	}

	// Update status
	if err := r.Status().Update(ctx, &a2aTask); err != nil {
		log.Error(err, "unable to update A2ATask status")
		return ctrl.Result{}, err
	}

	// Requeue for non-terminal tasks using the configured poll interval
	if !isTerminalPhase(a2aTask.Status.Phase) {
		pollInterval := time.Second * 5 // default fallback
		if a2aTask.Spec.PollInterval != nil {
			pollInterval = a2aTask.Spec.PollInterval.Duration
		}
		return ctrl.Result{RequeueAfter: pollInterval}, nil
	}

	return ctrl.Result{}, nil
}

func (r *A2ATaskReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&arkv1alpha1.A2ATask{}).
		Complete(r)
}

// isTerminalPhase returns true if the task phase represents a terminal state
func isTerminalPhase(phase string) bool {
	terminalPhases := []string{statusCompleted, statusFailed, statusCancelled}
	return slices.Contains(terminalPhases, phase)
}

// pollA2ATaskStatus queries the A2A server for the current task status and updates the A2ATask
func (r *A2ATaskReconciler) pollA2ATaskStatus(ctx context.Context, a2aTask *arkv1alpha1.A2ATask) error {
	a2aClient, err := r.createA2AClient(ctx, a2aTask)
	if err != nil {
		return err
	}

	task, err := r.queryTaskStatus(ctx, a2aClient, a2aTask.Spec.TaskID)
	if err != nil {
		return err
	}

	return r.updateTaskStatus(a2aTask, task)
}

// createA2AClient creates an A2A client for the task
func (r *A2ATaskReconciler) createA2AClient(ctx context.Context, a2aTask *arkv1alpha1.A2ATask) (*a2aclient.A2AClient, error) {
	serverNamespace := a2aTask.Spec.A2AServerRef.Namespace
	if serverNamespace == "" {
		serverNamespace = a2aTask.Namespace
	}

	var a2aServer arkv1prealpha1.A2AServer
	serverKey := client.ObjectKey{Name: a2aTask.Spec.A2AServerRef.Name, Namespace: serverNamespace}
	if err := r.Get(ctx, serverKey, &a2aServer); err != nil {
		return nil, fmt.Errorf("unable to get A2AServer %v: %w", serverKey, err)
	}

	a2aServerAddress := a2aServer.Status.LastResolvedAddress
	if a2aServerAddress == "" {
		return nil, fmt.Errorf("A2AServer %v has no resolved address", serverKey)
	}

	var clientOptions []a2aclient.Option
	if len(a2aServer.Spec.Headers) > 0 {
		resolvedHeaders := make(map[string]string)
		for _, header := range a2aServer.Spec.Headers {
			headerValue, err := genai.ResolveHeaderValueV1PreAlpha1(ctx, r.Client, header, serverNamespace)
			if err != nil {
				return nil, fmt.Errorf("failed to resolve header %s: %w", header.Name, err)
			}
			resolvedHeaders[header.Name] = headerValue
		}
		// TODO: implement header handling for client
		_ = resolvedHeaders
	}

	return a2aclient.NewA2AClient(a2aServerAddress, clientOptions...)
}

// queryTaskStatus queries the A2A server for task status
func (r *A2ATaskReconciler) queryTaskStatus(ctx context.Context, a2aClient *a2aclient.A2AClient, taskID string) (*protocol.Task, error) {
	historyLength := 100
	params := protocol.TaskQueryParams{
		ID:            taskID,
		HistoryLength: &historyLength,
	}
	task, err := a2aClient.GetTasks(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to get task status from A2A server: %w", err)
	}
	return task, nil
}

func (r *A2ATaskReconciler) mergeArtifacts(existingStatus, newStatus *arkv1alpha1.A2ATaskStatus) {
	existingArtifactIds := make(map[string]bool)
	for _, artifact := range existingStatus.Artifacts {
		existingArtifactIds[artifact.ArtifactID] = true
	}

	for _, newArtifact := range newStatus.Artifacts {
		if !existingArtifactIds[newArtifact.ArtifactID] {
			existingStatus.Artifacts = append(existingStatus.Artifacts, newArtifact)
		}
	}
}

func (r *A2ATaskReconciler) mergeHistory(existingStatus, newStatus *arkv1alpha1.A2ATaskStatus) {
	if len(newStatus.History) == 0 {
		return
	}

	existingMessages := make(map[string]bool)
	for _, existingMsg := range existingStatus.History {
		msgKey := r.generateMessageKey(existingMsg)
		existingMessages[msgKey] = true
	}

	for _, newMsg := range newStatus.History {
		msgKey := r.generateMessageKey(newMsg)
		if !existingMessages[msgKey] {
			existingStatus.History = append(existingStatus.History, newMsg)
			existingMessages[msgKey] = true
		}
	}
}

func (r *A2ATaskReconciler) updateTaskPhase(a2aTask *arkv1alpha1.A2ATask, task *protocol.Task) {
	newPhase := convertA2AStateToPhase(string(task.Status.State))
	if newPhase != a2aTask.Status.Phase {
		a2aTask.Status.Phase = newPhase

		// Update Completed condition based on phase
		switch newPhase {
		case statusPending, statusAssigned:
			r.setConditionCompleted(a2aTask, metav1.ConditionFalse, "TaskPending", "Task is pending execution")
		case statusRunning:
			r.setConditionCompleted(a2aTask, metav1.ConditionFalse, "TaskRunning", "Task is running")
		case statusCompleted:
			r.setConditionCompleted(a2aTask, metav1.ConditionTrue, "TaskSucceeded", "Task completed successfully")
		case statusFailed:
			r.setConditionCompleted(a2aTask, metav1.ConditionTrue, "TaskFailed", "Task failed")
		case statusCancelled:
			r.setConditionCompleted(a2aTask, metav1.ConditionTrue, "TaskCancelled", "Task was cancelled")
		}

		if isTerminalPhase(newPhase) {
			now := metav1.NewTime(time.Now())
			a2aTask.Status.CompletionTime = &now
			r.Recorder.Event(a2aTask, "Normal", "TaskCompleted",
				fmt.Sprintf("A2A task completed with status: %s", newPhase))
		}
	}
}

// updateTaskStatus updates the A2ATask status with information from the A2A server
func (r *A2ATaskReconciler) updateTaskStatus(a2aTask *arkv1alpha1.A2ATask, task *protocol.Task) error {
	if task == nil {
		return nil
	}

	newTaskData := arkv1alpha1.A2ATaskStatus{}
	genai.PopulateA2ATaskStatusFromProtocol(&newTaskData, task)

	if len(a2aTask.Status.History) == 0 && len(a2aTask.Status.Artifacts) == 0 {
		genai.PopulateA2ATaskStatusFromProtocol(&a2aTask.Status, task)
		r.updateTaskPhase(a2aTask, task)
		return nil
	}

	r.mergeArtifacts(&a2aTask.Status, &newTaskData)
	r.mergeHistory(&a2aTask.Status, &newTaskData)

	a2aTask.Status.ProtocolState = newTaskData.ProtocolState
	a2aTask.Status.ProtocolMetadata = newTaskData.ProtocolMetadata
	a2aTask.Status.SessionID = newTaskData.SessionID
	a2aTask.Status.LastStatusMessage = newTaskData.LastStatusMessage
	a2aTask.Status.LastStatusTimestamp = newTaskData.LastStatusTimestamp

	r.updateTaskPhase(a2aTask, task)

	return nil
}

// convertA2AStateToPhase converts A2A protocol task states to K8s A2ATask phases
func convertA2AStateToPhase(state string) string {
	switch state {
	case "submitted":
		return statusAssigned
	case "working":
		return statusRunning
	case "completed":
		return statusCompleted
	case "failed":
		return statusFailed
	case "canceled", "cancelled":
		return statusCancelled
	case "rejected":
		return statusFailed
	case "input-required", "auth-required":
		return statusRunning // Keep running until resolved
	default:
		return statusRunning
	}
}

// generateMessageKey creates a unique key for a message based on its content
// This key is used to determine if a message already exists in the history
func (r *A2ATaskReconciler) generateMessageKey(msg arkv1alpha1.A2ATaskMessage) string {
	var content strings.Builder

	// Include role
	content.WriteString(msg.Role)
	content.WriteString("|")

	// Include all text parts content
	for i, part := range msg.Parts {
		if i > 0 {
			content.WriteString("||")
		}
		content.WriteString(part.Kind)
		content.WriteString(":")
		switch part.Kind {
		case "text":
			content.WriteString(part.Text)
		case "data":
			content.WriteString(part.Data)
		case "file":
			content.WriteString(part.URI)
			content.WriteString(part.MimeType)
		}
	}

	// Create a hash of the content to keep the key manageable
	hash := sha256.Sum256([]byte(content.String()))
	return fmt.Sprintf("%x", hash)
}

// setConditionCompleted sets the Completed condition on the A2ATask
func (r *A2ATaskReconciler) setConditionCompleted(a2aTask *arkv1alpha1.A2ATask, status metav1.ConditionStatus, reason, message string) {
	meta.SetStatusCondition(&a2aTask.Status.Conditions, metav1.Condition{
		Type:               string(arkv1alpha1.A2ATaskCompleted),
		Status:             status,
		Reason:             reason,
		Message:            message,
		ObservedGeneration: a2aTask.Generation,
	})
}

// Force devspace reload ven  5 set 2025 14:30:15 CEST - Added HistoryLength to TaskQueryParams
