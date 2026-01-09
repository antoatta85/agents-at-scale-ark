#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_ROOT=$(dirname "${BASH_SOURCE[0]}")/..

echo "Generating deepcopy functions..."

cd "${SCRIPT_ROOT}"

go run k8s.io/code-generator/cmd/deepcopy-gen \
  --output-file zz_generated_deepcopy.go \
  --go-header-file ./hack/boilerplate.go.txt \
  ./pkg/apis/ark/v1alpha1

go run k8s.io/code-generator/cmd/deepcopy-gen \
  --output-file zz_generated_deepcopy.go \
  --go-header-file ./hack/boilerplate.go.txt \
  ./pkg/apis/ark/v1prealpha1

echo "Done."
