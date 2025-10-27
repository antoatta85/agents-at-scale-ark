#!/bin/bash

# ARK Demos Installation Script
# This script helps install the ARK demos Helm chart with proper configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
NAMESPACE="ark-demos"
RELEASE_NAME="ark-demos"
CHART_PATH="./charts/ark-demos"
MODEL_TYPE="azure"
MODEL_VERSION="gpt-4o-mini"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "ARK Demos Installation Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -n, --namespace NAME     Kubernetes namespace (default: ark-demos)"
    echo "  -r, --release NAME       Helm release name (default: ark-demos)"
    echo "  -m, --model TYPE         Model type: azure, openai, claude, gemini (default: azure)"
    echo "  -v, --model-version VER  Model version (default: gpt-4o-mini)"
    echo "  --math-only              Install only math demo"
    echo "  --weather-only           Install only weather demo"
    echo "  --research-only          Install only research demo"
    echo "  --skip-mcp               Skip MCP server deployment"
    echo "  --dry-run                Show what would be installed without installing"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Install all demos with default settings"
    echo "  $0 --math-only                       # Install only math demo"
    echo "  $0 -m openai -v gpt-4                # Use OpenAI GPT-4 model"
    echo "  $0 --dry-run                          # Preview installation"
}

# Parse command line arguments
MATH_ONLY=false
WEATHER_ONLY=false
RESEARCH_ONLY=false
SKIP_MCP=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -r|--release)
            RELEASE_NAME="$2"
            shift 2
            ;;
        -m|--model)
            MODEL_TYPE="$2"
            shift 2
            ;;
        -v|--model-version)
            MODEL_VERSION="$2"
            shift 2
            ;;
        --math-only)
            MATH_ONLY=true
            shift
            ;;
        --weather-only)
            WEATHER_ONLY=true
            shift
            ;;
        --research-only)
            RESEARCH_ONLY=true
            shift
            ;;
        --skip-mcp)
            SKIP_MCP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate model type
case $MODEL_TYPE in
    azure|openai|claude|gemini)
        ;;
    *)
        print_error "Invalid model type: $MODEL_TYPE. Must be one of: azure, openai, claude, gemini"
        exit 1
        ;;
esac

# Check prerequisites
print_status "Checking prerequisites..."

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed or not in PATH"
    exit 1
fi

# Check if helm is available
if ! command -v helm &> /dev/null; then
    print_error "helm is not installed or not in PATH"
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster"
    exit 1
fi

print_success "Prerequisites check passed"

# Prepare Helm values
print_status "Preparing Helm values..."

HELM_VALUES=""
HELM_VALUES="$HELM_VALUES --set model.type=$MODEL_TYPE"
HELM_VALUES="$HELM_VALUES --set model.model.value=$MODEL_VERSION"

# Configure demo selection
if [ "$MATH_ONLY" = true ]; then
    HELM_VALUES="$HELM_VALUES --set demos.weather.enabled=false"
    HELM_VALUES="$HELM_VALUES --set demos.research.enabled=false"
    print_status "Installing only math demo"
elif [ "$WEATHER_ONLY" = true ]; then
    HELM_VALUES="$HELM_VALUES --set demos.math.enabled=false"
    HELM_VALUES="$HELM_VALUES --set demos.research.enabled=false"
    print_status "Installing only weather demo"
elif [ "$RESEARCH_ONLY" = true ]; then
    HELM_VALUES="$HELM_VALUES --set demos.math.enabled=false"
    HELM_VALUES="$HELM_VALUES --set demos.weather.enabled=false"
    print_status "Installing only research demo"
else
    print_status "Installing all demos"
fi

# Configure MCP servers
if [ "$SKIP_MCP" = true ]; then
    HELM_VALUES="$HELM_VALUES --set mcp.filesys.enabled=false"
    HELM_VALUES="$HELM_VALUES --set mcp.websearch.enabled=false"
    print_status "Skipping MCP server deployment"
fi

# Create namespace if it doesn't exist
print_status "Creating namespace: $NAMESPACE"
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    kubectl create namespace "$NAMESPACE"
    print_success "Namespace $NAMESPACE created"
else
    print_status "Namespace $NAMESPACE already exists"
fi

# Install or upgrade the chart
print_status "Installing ARK demos..."

if [ "$DRY_RUN" = true ]; then
    print_status "DRY RUN - Showing what would be installed:"
    helm install "$RELEASE_NAME" "$CHART_PATH" \
        --namespace "$NAMESPACE" \
        $HELM_VALUES \
        --dry-run
else
    # Check if release already exists
    if helm list -n "$NAMESPACE" | grep -q "$RELEASE_NAME"; then
        print_status "Upgrading existing release: $RELEASE_NAME"
        helm upgrade "$RELEASE_NAME" "$CHART_PATH" \
            --namespace "$NAMESPACE" \
            $HELM_VALUES
    else
        print_status "Installing new release: $RELEASE_NAME"
        helm install "$RELEASE_NAME" "$CHART_PATH" \
            --namespace "$NAMESPACE" \
            $HELM_VALUES
    fi
    
    print_success "ARK demos installed successfully!"
    
    # Show installation summary
    echo ""
    print_status "Installation Summary:"
    echo "  Namespace: $NAMESPACE"
    echo "  Release: $RELEASE_NAME"
    echo "  Model: $MODEL_TYPE ($MODEL_VERSION)"
    echo ""
    
    # Show next steps
    print_status "Next Steps:"
    echo "  1. Check deployment status:"
    echo "     kubectl get agents,teams,queries -n $NAMESPACE"
    echo ""
    echo "  2. Test the demos:"
    echo "     kubectl get query math-query -n $NAMESPACE -o yaml"
    echo "     kubectl get query weather-query -n $NAMESPACE -o yaml"
    echo "     kubectl get query research-query -n $NAMESPACE -o yaml"
    echo ""
    echo "  3. Monitor logs:"
    echo "     kubectl logs -l app=agent-go-controller-manager -n ark-system"
    echo ""
    echo "  4. Uninstall when done:"
    echo "     helm uninstall $RELEASE_NAME -n $NAMESPACE"
fi

print_success "Script completed successfully!"
