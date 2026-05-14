# DreamAcademy — Makefile
# Usage: make <command>
#   make setup     — full first-time setup (install, db, migrate, seed, dev)
#   make dev       — start dev server
#   make docker-up — start production via Docker Compose

.PHONY: setup dev build start db-up db-down db-migrate db-seed db-reset \
        docker-up docker-down docker-build test lint clean

# ── Configuration ──────────────────────────────────────────────
NODE_VERSION := 20
APP_PORT := 3000
DB_PORT := 3306

# ── First-time setup ───────────────────────────────────────────
setup: check-node check-docker
	@echo "=== DreamAcademy setup ==="
	npm install
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo "!!! EDIT .env BEFORE CONTINUING (especially APP_SECRET, DATABASE_URL) !!!"; \
		exit 1; \
	fi
	@echo "Starting MySQL..."
	docker-compose up -d db
	@echo "Waiting for MySQL to be ready..."
	@sleep 10
	@echo "Running migrations..."
	npm run db:migrate
	@echo "Seeding database..."
	npx tsx db/seed.ts
	@echo "=== Setup complete. Run 'make dev' to start the server ==="

# ── Development ────────────────────────────────────────────────
dev: check-node
	@echo "Starting dev server on http://localhost:$(APP_PORT)"
	npm run dev

# ── Production build & run ─────────────────────────────────────
build: check-node
	npm run build

start: check-node
	NODE_ENV=production npm run start

# ── Database ───────────────────────────────────────────────────
db-up:
	docker-compose up -d db
	@echo "MySQL started on port $(DB_PORT). Wait ~10s before migrating."

db-down:
	docker-compose down db

db-migrate: check-node
	npm run db:migrate

db-seed: check-node
	npx tsx db/seed.ts

db-reset: db-down
	@echo "Removing MySQL volume..."
	docker volume rm dreamdocs_academy_mysql_data 2>/dev/null || true
	$(MAKE) db-up
	@sleep 10
	$(MAKE) db-migrate
	$(MAKE) db-seed

# ── Docker Compose (full production stack) ─────────────────────
docker-up:
	@if [ ! -f .env ]; then \
		echo "ERROR: .env not found. Copy .env.example to .env and fill it in."; \
		exit 1; \
	fi
	docker-compose up --build -d

docker-down:
	docker-compose down

docker-build:
	docker-compose build --no-cache

# ── Testing & quality ──────────────────────────────────────────
test: check-node
	npx playwright test

lint: check-node
	npm run lint

# ── Utilities ──────────────────────────────────────────────────
clean:
	rm -rf node_modules dist
	docker-compose down -v

check-node:
	@node -v >/dev/null 2>&1 || (echo "ERROR: Node.js $(NODE_VERSION)+ is required." && exit 1)
	@node -e "const v=process.version.slice(1).split('.'); if(v[0]<20) { console.error('ERROR: Node.js 20+ required, found '+process.version); process.exit(1) }" 2>/dev/null

check-docker:
	@docker -v >/dev/null 2>&1 || (echo "ERROR: Docker is required." && exit 1)
