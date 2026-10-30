.PHONY: setup dev test lint db-migrate db-reset eval-data eval \
        k8s-build k8s-secrets k8s-up k8s-status k8s-logs k8s-down

# ── Local development ────────────────────────────────────────────────────────

setup:
	@command -v hivemind >/dev/null 2>&1 || brew install hivemind
	uv sync
	npm install --prefix frontend
	@mkdir -p data/audio
	@cp -n .env.example .env 2>/dev/null || true
	uv run pre-commit install
	@echo "Setup complete. Edit .env if needed, then run: make dev"

dev:
	hivemind

test:
	uv run pytest
	npm run test --prefix frontend

lint:
	uv run ruff check .
	uv run ruff format --check .
	uv run mypy core/src backend/api/src backend/worker/src
	npm run lint --prefix frontend

# ── Database ─────────────────────────────────────────────────────────────────

db-migrate:
	uv run alembic -c core/alembic.ini upgrade head

db-reset:
	uv run alembic -c core/alembic.ini downgrade base
	uv run alembic -c core/alembic.ini upgrade head

# ── Evals ────────────────────────────────────────────────────────────────────

eval-data:
	uv run python -m blurt_evals.generate

eval:
	uv run python -m blurt_evals.run

# ── Kubernetes ───────────────────────────────────────────────────────────────

k8s-build:
	docker build -f infra/docker/api.Dockerfile -t blurt-api:dev .
	docker build -f infra/docker/worker.Dockerfile -t blurt-worker:dev .
	docker build -f infra/docker/frontend.Dockerfile -t blurt-frontend:dev .

k8s-secrets:
	bash scripts/k8s-secrets.sh

k8s-up:
	kubectl apply -k infra/k8s/overlays/local
	kubectl wait --for=condition=complete job/migrate -n blurt --timeout=120s
	kubectl rollout status deployment/api -n blurt
	kubectl rollout status deployment/worker -n blurt
	kubectl rollout status deployment/frontend -n blurt

k8s-status:
	kubectl get pods,svc -n blurt

k8s-logs:
	kubectl logs -n blurt -l app.kubernetes.io/part-of=blurt --prefix -f

k8s-down:
	kubectl delete namespace blurt
