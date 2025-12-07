# clickhouse service build configuration

CLICKHOUSE_SERVICE_NAME := clickhouse
CLICKHOUSE_SERVICE_DIR := services/$(CLICKHOUSE_SERVICE_NAME)
CLICKHOUSE_OUT := $(OUT)/$(CLICKHOUSE_SERVICE_NAME)

# Service-specific variables
CLICKHOUSE_NAMESPACE ?= clickhouse
CLICKHOUSE_RELEASE_NAME ?= clickhouse

# Pre-calculate all stamp paths
CLICKHOUSE_STAMP_BUILD := $(CLICKHOUSE_OUT)/stamp-build
CLICKHOUSE_STAMP_INSTALL := $(CLICKHOUSE_OUT)/stamp-install
CLICKHOUSE_STAMP_TEST := $(CLICKHOUSE_OUT)/stamp-test

# Add service output directory to clean targets
CLEAN_TARGETS += $(CLICKHOUSE_OUT)

# Define phony targets
.PHONY: $(CLICKHOUSE_SERVICE_NAME)-build $(CLICKHOUSE_SERVICE_NAME)-install $(CLICKHOUSE_SERVICE_NAME)-uninstall $(CLICKHOUSE_SERVICE_NAME)-test $(CLICKHOUSE_SERVICE_NAME)-dev

# Build target (no build needed for direct Docker image use)
$(CLICKHOUSE_SERVICE_NAME)-build: $(CLICKHOUSE_STAMP_BUILD) # HELP: Build clickhouse (pre-built images)
$(CLICKHOUSE_STAMP_BUILD): $(CLICKHOUSE_SERVICE_DIR)/chart/Chart.yaml | $(OUT)
	@mkdir -p $(dir $@)
	@echo "ClickHouse uses pre-built images - no build needed"
	@touch $@

# Install target
$(CLICKHOUSE_SERVICE_NAME)-install: $(CLICKHOUSE_STAMP_INSTALL) # HELP: Deploy clickhouse to cluster
$(CLICKHOUSE_STAMP_INSTALL): $(CLICKHOUSE_STAMP_BUILD) | $(OUT)
	@mkdir -p $(dir $@)
	@echo "Installing clickhouse..."
	kubectl create namespace $(CLICKHOUSE_NAMESPACE) --dry-run=client -o yaml | kubectl apply -f -
	helm upgrade --install $(CLICKHOUSE_RELEASE_NAME) \
		$(CLICKHOUSE_SERVICE_DIR)/chart \
		--namespace $(CLICKHOUSE_NAMESPACE) \
		--wait
	@touch $@

# Uninstall target
$(CLICKHOUSE_SERVICE_NAME)-uninstall: # HELP: Remove clickhouse from cluster
	@echo "Uninstalling clickhouse..."
	helm uninstall $(CLICKHOUSE_RELEASE_NAME) --namespace $(CLICKHOUSE_NAMESPACE) --ignore-not-found
	kubectl delete namespace $(CLICKHOUSE_NAMESPACE) --ignore-not-found
	@echo "clickhouse uninstalled successfully"
	rm -f $(CLICKHOUSE_STAMP_INSTALL)

# Test target
$(CLICKHOUSE_SERVICE_NAME)-test: $(CLICKHOUSE_STAMP_TEST) # HELP: Run tests for clickhouse service
$(CLICKHOUSE_STAMP_TEST): $(CLICKHOUSE_STAMP_BUILD) | $(OUT)
	@mkdir -p $(dir $@)
	@printf '\033[0;31m⚠️  NO TESTS ARE DEFINED for $(CLICKHOUSE_SERVICE_NAME)\033[0m\n'
	@touch $@

# Dev target using devspace
$(CLICKHOUSE_SERVICE_NAME)-dev: $(CLICKHOUSE_STAMP_BUILD) # HELP: Deploy clickhouse with devspace for development
	@echo "Deploying clickhouse with devspace..."
	cd $(CLICKHOUSE_SERVICE_DIR) && devspace dev
