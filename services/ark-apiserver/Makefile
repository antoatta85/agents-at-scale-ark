include ../../helpers.mk

.DEFAULT_GOAL := help

BINARY_NAME := ark-apiserver
IMAGE_NAME := ark-apiserver

.PHONY: help build build-binary test lint dev install uninstall clean generate

help:
	@grep -E '^[a-zA-Z0-9 -]+:.*#'  Makefile | sort | while read -r l; do printf "\033[1;32m$$(echo $$l | cut -f 1 -d':')\033[00m:$$(echo $$l | cut -f 2- -d'#')\n"; done

build: # build Docker image
	docker build -t $(IMAGE_NAME):latest .

build-binary: # build Go binary locally
	CGO_ENABLED=1 go build -o bin/$(BINARY_NAME) ./cmd/apiserver

test: # run tests
	go test -v ./...

lint: # run linting
	golangci-lint run ./...

dev: # run service in development mode
	go run ./cmd/apiserver \
		--secure-port=8443 \
		--storage-driver=sqlite \
		--sqlite-path=./data/ark.db

install: # deploy service to cluster
	cd ../.. && make ark-apiserver-install

uninstall: # remove service from cluster
	cd ../.. && make ark-apiserver-uninstall

clean: # clean build artifacts
	rm -rf bin/ data/

generate: # generate deepcopy functions
	./hack/update-codegen.sh

mod-tidy: # tidy go modules
	go mod tidy
