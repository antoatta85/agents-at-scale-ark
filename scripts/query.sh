#!/usr/bin/env bash

# Query agents or teams using kubectl
# Usage: ./query.sh <type/name> "<query>"

set -e -o pipefail

# Colors
red='\033[0;31m'
green='\033[0;32m'
blue='\033[0;34m'
white='\033[1;37m'
nc='\033[0m' # No Color

show_help() {
    echo "this script will be retired soon..."
    echo "usage: query.sh [options] <type/name> \"<query>\""
    echo ""
    echo "examples:"
    echo "  query.sh agent/weather-agent \"What's the weather today?\""
    echo "  query.sh team/github-team \"Find a Python repository and review it\""
    echo "  query.sh -s session123 agent/weather-agent \"What's the weather today?\""
    echo "  query.sh -m custom-memory agent/weather-agent \"What's the weather?\""
    echo ""
    echo "options:"
    echo "  -s <session>            session id to resume conversations"
    echo "  -m <memory>             memory name to use"
    echo "  --install-completion    install bash completion for this script"
}

install_completion() {
    # Create completion function with improved logic
    local completion_code='
_query_completion() {
    local cur prev
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    
    if [[ ${COMP_CWORD} == 1 ]]; then
        local completions=""
        
        # Determine what to show based on current input
        if [[ -z "$cur" ]]; then
            # Nothing entered - show both agents and teams
            local agents teams
            agents=$(kubectl get agents -o jsonpath='"'"'{range .items[*]}agent/{.metadata.name}{"\n"}{end}'"'"' 2>/dev/null | tr "\n" " ")
            teams=$(kubectl get teams -o jsonpath='"'"'{range .items[*]}team/{.metadata.name}{"\n"}{end}'"'"' 2>/dev/null | tr "\n" " ")
            completions="$agents $teams"
        elif [[ "$cur" == agent* ]]; then
            # User started typing "agent" - show only agents
            completions=$(kubectl get agents -o jsonpath='"'"'{range .items[*]}agent/{.metadata.name}{"\n"}{end}'"'"' 2>/dev/null | tr "\n" " ")
        elif [[ "$cur" == team* ]]; then
            # User started typing "team" - show only teams
            completions=$(kubectl get teams -o jsonpath='"'"'{range .items[*]}team/{.metadata.name}{"\n"}{end}'"'"' 2>/dev/null | tr "\n" " ")
        else
            # Mixed input - show both and let compgen filter
            local agents teams
            agents=$(kubectl get agents -o jsonpath='"'"'{range .items[*]}agent/{.metadata.name}{"\n"}{end}'"'"' 2>/dev/null | tr "\n" " ")
            teams=$(kubectl get teams -o jsonpath='"'"'{range .items[*]}team/{.metadata.name}{"\n"}{end}'"'"' 2>/dev/null | tr "\n" " ")
            completions="$agents $teams"
        fi
        
        # Generate completions based on current input
        COMPREPLY=( $(compgen -W "$completions" -- ${cur}) )
    fi
}
complete -F _query_completion query.sh
complete -F _query_completion query
'
    
    # Add to ~/.bashrc if not already there
    if ! grep -q "_query_completion" ~/.bashrc 2>/dev/null; then
        echo "# Query script completion" >> ~/.bashrc
        echo "$completion_code" >> ~/.bashrc
        echo -e "${green}✔${nc} completion installed to ~/.bashrc"
        echo "restart your shell or run: source ~/.bashrc"
    else
        echo -e "${red}warning${nc}: completion already installed"
    fi
}

# Parse options
session=""
memory=""
timeout=""
ttl=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -s)
            session="$2"
            shift 2
            ;;
        -m)
            memory="$2"
            shift 2
            ;;
        --timeout)
            timeout="$2"
            shift 2
            ;;
        --ttl)
            ttl="$2"
            shift 2
            ;;
        --install-completion)
            install_completion
            exit 0
            ;;
        *)
            break
            ;;
    esac
done


target="$1"
query_text="$2"

# Check for missing parameters
if [[ -z "$target" || -z "$query_text" ]]; then
    echo -e "${red}error${nc}: missing required parameters"
    show_help
    exit 1
fi

# Parse target into type and name
if [[ "$target" =~ ^(agent|team)/(.+)$ ]]; then
    target_type="${BASH_REMATCH[1]}"
    target_name="${BASH_REMATCH[2]}"
else
    echo -e "${red}error${nc}: target must be in format 'agent/name' or 'team/name'"
    show_help
    exit 1
fi

echo -n -e "querying: ${green}${target_type}/${target_name}${nc}"

# Build query spec
query_spec="apiVersion: ark.mckinsey.com/v1alpha1
kind: Query
metadata:
  generateName: query
spec:
  target:
    type: ${target_type}
    name: \"${target_name}\"
  input: \"${query_text}\""
# Add session if provided
if [[ -n "$session" ]]; then
    query_spec+="
  sessionId: \"${session}\""
fi

# Add memory if provided
if [[ -n "$memory" ]]; then
    query_spec+="
  memory:
    name: \"${memory}\""
fi

# Add timeout if provided
if [[ -n "$timeout" ]]; then
    query_spec+="
  timeout: \"${timeout}\""
fi

# Add ttl if provided
if [[ -n "$ttl" ]]; then
    query_spec+="
  ttl: \"${ttl}\""
fi

# Create query with unique name
query_output=$(kubectl create -f - <<EOF
$query_spec
EOF
)

# Extract query name from creation output
query_name=$(echo "$query_output" | awk '{print $1}' | cut -d'/' -f2)

# Wait for query completion
while true; do
    status=$(kubectl get query "$query_name" -o jsonpath='{.status.phase}' 2>/dev/null || echo "")
    
    if [[ "$status" == "done" ]]; then
        echo ""
        response_content=$(kubectl get query "$query_name" -o jsonpath='{.status.response.content}' 2>/dev/null || echo "no response found")
        echo -e "${green}${target_name}${nc}: ${blue}${response_content}${nc}"
        exit 0
    elif [[ "$status" == "error" ]]; then
        echo ""
        error_message=$(kubectl get events --field-selector involvedObject.name="$query_name" --sort-by='.lastTimestamp' -o jsonpath='{.items[-1].message}' 2>/dev/null || echo "unknown error")
        echo -e "${red}error${nc}: $error_message"
        exit 1
    else
        echo -n "."
        sleep 1
    fi
done 
