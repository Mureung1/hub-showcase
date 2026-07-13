SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help setup up down run test integration eval check observe load-smoke reset

help: ## Show the canonical development commands.
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z0-9_-]+:.*## / {printf "\033[36m%-16s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Validate Java 17 and required tools; create .env only when absent.
	@bash scripts/setup.sh

up: ## Start PostgreSQL, Redis, and the two mock APIs and wait for health.
	@bash scripts/up.sh

down: ## Remove non-Dev-Container services without deleting data volumes.
	@bash scripts/down.sh

run: ## Start infrastructure and run the backend with the local profile.
	@bash scripts/run.sh

test: ## Run Docker-free unit tests.
	@bash scripts/test.sh unit

integration: ## Run Testcontainers and WireMock integration/contract tests.
	@bash scripts/test.sh integration

eval: ## Validate and run deterministic evaluation fixtures.
	@bash scripts/test.sh eval

check: ## Run policy, docs, Compose, shell, unit, integration, and eval checks once.
	@bash scripts/check.sh

observe: ## Start Prometheus and Grafana alongside the base infrastructure.
	@bash scripts/observe.sh

load-smoke: ## Run the one-iteration Actuator health smoke test in k6.
	@bash scripts/load-smoke.sh

reset: ## Delete local service containers and application data after confirmation.
	@bash scripts/reset.sh
