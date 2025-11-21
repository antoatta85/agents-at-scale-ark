package config

import (
	ctrl "sigs.k8s.io/controller-runtime"

	"mckinsey.com/ark/internal/eventing"
	k8seventing "mckinsey.com/ark/internal/eventing/kubernetes"
	"mckinsey.com/ark/internal/eventing/trackers"
)

type Provider struct {
	modelTracker eventing.ModelTracker
	a2aTracker   eventing.A2aTracker
}

func NewProvider(mgr ctrl.Manager) eventing.Provider {
	recorder := mgr.GetEventRecorderFor("ark-controller")
	emitter := k8seventing.NewKubernetesEventEmitter(recorder)

	return &Provider{
		modelTracker: trackers.NewModelTracker(emitter),
		a2aTracker:   trackers.NewA2aTracker(emitter),
	}
}

func (p *Provider) ModelTracker() eventing.ModelTracker {
	return p.modelTracker
}

func (p *Provider) A2aTracker() eventing.A2aTracker {
	return p.a2aTracker
}
