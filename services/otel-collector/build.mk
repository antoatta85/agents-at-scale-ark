# otel-collector service build configuration

OTEL_COLLECTOR_SERVICE_NAME := otel-collector
OTEL_COLLECTOR_SERVICE_DIR := services/$(OTEL_COLLECTOR_SERVICE_NAME)
OTEL_COLLECTOR_OUT := $(OUT)/$(OTEL_COLLECTOR_SERVICE_NAME)

# Service-specific variables
OTEL_COLLECTOR_NAMESPACE ?= otel-collector
OTEL_COLLECTOR_RELEASE_NAME ?= otel-collector

# Pre-calculate all stamp paths
OTEL_COLLECTOR_STAMP_BUILD := $(OTEL_COLLECTOR_OUT)/stamp-build
OTEL_COLLECTOR_STAMP_INSTALL := $(OTEL_COLLECTOR_OUT)/stamp-install
OTEL_COLLECTOR_STAMP_TEST := $(OTEL_COLLECTOR_OUT)/stamp-test

# Add service output directory to clean targets
CLEAN_TARGETS += $(OTEL_COLLECTOR_OUT)

# Define phony targets
.PHONY: $(OTEL_COLLECTOR_SERVICE_NAME)-build $(OTEL_COLLECTOR_SERVICE_NAME)-install $(OTEL_COLLECTOR_SERVICE_NAME)-uninstall $(OTEL_COLLECTOR_SERVICE_NAME)-test $(OTEL_COLLECTOR_SERVICE_NAME)-dev

# Build target (update Helm dependencies)
$(OTEL_COLLECTOR_SERVICE_NAME)-build: $(OTEL_COLLECTOR_STAMP_BUILD) # HELP: Build otel-collector (update Helm dependencies)
$(OTEL_COLLECTOR_STAMP_BUILD): $(OTEL_COLLECTOR_SERVICE_DIR)/chart/Chart.yaml | $(OUT)
	@mkdir -p $(dir $@)
	@echo "Updating Helm dependencies for otel-collector..."
	helm dependency update $(OTEL_COLLECTOR_SERVICE_DIR)/chart
	@touch $@

# Install target
$(OTEL_COLLECTOR_SERVICE_NAME)-install: $(OTEL_COLLECTOR_STAMP_INSTALL) # HELP: Deploy otel-collector to cluster
$(OTEL_COLLECTOR_STAMP_INSTALL): $(OTEL_COLLECTOR_STAMP_BUILD) | $(OUT)
	@mkdir -p $(dir $@)
	@echo "Installing otel-collector..."
	kubectl create namespace $(OTEL_COLLECTOR_NAMESPACE) --dry-run=client -o yaml | kubectl apply -f -
	helm upgrade --install $(OTEL_COLLECTOR_RELEASE_NAME) \
		$(OTEL_COLLECTOR_SERVICE_DIR)/chart \
		--namespace $(OTEL_COLLECTOR_NAMESPACE) \
		--wait
	@echo "Restarting ark-controller to pick up OTEL configuration..."
	@if kubectl get deployment ark-controller-devspace -n ark-system >/dev/null 2>&1; then \
		kubectl rollout restart deployment/ark-controller-devspace -n ark-system; \
	elif kubectl get deployment ark-controller -n ark-system >/dev/null 2>&1; then \
		kubectl rollout restart deployment/ark-controller -n ark-system; \
	fi
	@touch $@

# Uninstall target
$(OTEL_COLLECTOR_SERVICE_NAME)-uninstall: # HELP: Remove otel-collector from cluster
	@echo "Uninstalling otel-collector..."
	helm uninstall $(OTEL_COLLECTOR_RELEASE_NAME) --namespace $(OTEL_COLLECTOR_NAMESPACE) --ignore-not-found
	kubectl delete namespace $(OTEL_COLLECTOR_NAMESPACE) --ignore-not-found
	@echo "otel-collector uninstalled successfully"
	rm -f $(OTEL_COLLECTOR_STAMP_INSTALL)

# Test target
$(OTEL_COLLECTOR_SERVICE_NAME)-test: $(OTEL_COLLECTOR_STAMP_TEST) # HELP: Run tests for otel-collector service
$(OTEL_COLLECTOR_STAMP_TEST): $(OTEL_COLLECTOR_STAMP_BUILD) | $(OUT)
	@mkdir -p $(dir $@)
	@printf '\033[0;31m⚠️  NO TESTS ARE DEFINED for $(OTEL_COLLECTOR_SERVICE_NAME)\033[0m\n'
	@touch $@

# Dev target using devspace
$(OTEL_COLLECTOR_SERVICE_NAME)-dev: $(OTEL_COLLECTOR_STAMP_BUILD) # HELP: Deploy otel-collector with devspace for development
	@echo "Deploying otel-collector with devspace..."
	cd $(OTEL_COLLECTOR_SERVICE_DIR) && devspace dev
