# DreamAcademy — Makefile
# Usage: make <command>
#
#  LOCAL DEVELOPMENT:
#    make setup     — full first-time setup (install, db, migrate, seed)
#    make dev       — start dev server
#
#  SERVER DEPLOYMENT (one-command):
#    make server-install  — first deploy on fresh server (clone, build, up, migrate, seed)
#    make deploy          — update running server (pull, build, migrate, restart)
#    make docker-deploy   — full Docker Compose stack with auto-migrate + seed
#
#  DOCKER:
#    make docker-up       — start production stack
#    make docker-down     — stop stack
#    make docker-build    — rebuild images
#
#  DATABASE:
#    make db-up           — start MySQL container
#    make db-migrate      — run migrations
#    make db-seed         — seed data
#    make db-reset        — reset DB volume + re-migrate + re-seed
#
#  MONITORING:
#    make logs            — show all logs
#    make logs-app        — show app logs only
#    make status          — show running containers
#
#  UTILITY:
#    make clean           — remove node_modules, dist, docker volumes
#    make test            — run E2E tests
#    make lint            — type check

.PHONY: setup dev build start db-up db-down db-migrate db-seed db-reset \
        docker-up docker-down docker-build docker-deploy \
        server-install deploy logs logs-app status test lint clean \
        check-node check-docker wait-mysql

# ── Configuration ──────────────────────────────────────────────
NODE_VERSION := 20
APP_PORT     := 3000
DB_PORT      := 3306
GIT_REPO     := https://github.com/kiruha3/DreamAcademy_.git

# ═══════════════════════════════════════════════════════════════
#  ONE-COMMAND SERVER COMMANDS
# ═══════════════════════════════════════════════════════════════

# First-time install on a fresh server (run this once)
server-install: check-docker
	@echo "=== DreamAcademy Server Install ==="
	@if [ ! -d .git ]; then \
		echo "Cloning repository..."; \
		git clone $(GIT_REPO) .tmp_clone && mv .tmp_clone/* .tmp_clone/.* . 2>/dev/null || true && rm -rf .tmp_clone; \
	fi
	@if [ ! -f .env ]; then \
		echo "Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo ""; \
		echo "╔══════════════════════════════════════════════════════════════════════╗"; \
		echo "║  ⚠️  ACTION REQUIRED: Edit .env before continuing!                 ║"; \
		echo "║     Set: APP_SECRET, DATABASE_URL, S3_*, OWNER_UNION_ID            ║"; \
		echo "╚══════════════════════════════════════════════════════════════════════╝"; \
		echo ""; \
		exit 1; \
	fi
	@echo "Installing dependencies..."
	npm ci
	@echo "Building application..."
	npm run build
	@echo "Starting Docker stack..."
	docker-compose up -d db
	@echo "Waiting for MySQL to be ready..."
	@$(MAKE) wait-mysql
	@echo "Running migrations..."
	npx drizzle-kit migrate
	@echo "Seeding database..."
	npx tsx db/seed.ts
	@echo "Starting application container..."
	docker-compose up -d app
	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════════════╗"
	@echo "║  ✅ Server install complete!                                         ║"
	@echo "║     App: http://localhost:$(APP_PORT)                                ║"
	@echo "║     Run 'make logs' to see output                                    ║"
	@echo "╚══════════════════════════════════════════════════════════════════════╝"

# Update existing server (pull → rebuild → migrate → restart)
deploy: check-docker check-node
	@echo "=== DreamAcademy Deploy ==="
	@echo "Pulling latest code..."
	git pull origin master || git pull origin main
	@echo "Installing dependencies..."
	npm ci
	@echo "Building application..."
	npm run build
	@echo "Stopping old containers..."
	docker-compose down
	@echo "Starting updated stack..."
	docker-compose up -d db
	@echo "Waiting for MySQL to be ready..."
	@$(MAKE) wait-mysql
	@echo "Running migrations..."
	npx drizzle-kit migrate
	@echo "Starting application..."
	docker-compose up -d app
	@echo "Cleaning up old images..."
	docker system prune -f
	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════════════╗"
	@echo "║  ✅ Deploy complete!                                                 ║"
	@echo "╚══════════════════════════════════════════════════════════════════════╝"
	@$(MAKE) status

# Full Docker-only deploy (builds inside Docker, no local Node needed)
docker-deploy: check-docker
	@echo "=== DreamAcademy Docker Deploy ==="
	@if [ ! -f .env ]; then \
		echo "ERROR: .env not found. Run 'cp .env.example .env' and fill it in."; \
		exit 1; \
	fi
	@echo "Building and starting stack..."
	docker-compose down
	docker-compose up --build -d
	@echo "Waiting for MySQL to be ready..."
	@sleep 15
	@echo "Running migrations inside container..."
	docker-compose exec -T app npx drizzle-kit migrate || echo "Migration container not ready, retry manually with: docker-compose exec app npx drizzle-kit migrate"
	@echo "Seeding database inside container..."
	docker-compose exec -T app npx tsx db/seed.ts || echo "Seed skipped or failed, run manually if needed"
	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════════════╗"
	@echo "║  ✅ Docker deploy complete!                                          ║"
	@echo "╚══════════════════════════════════════════════════════════════════════╝"
	@$(MAKE) status

# ═══════════════════════════════════════════════════════════════
#  LOCAL DEVELOPMENT
# ═══════════════════════════════════════════════════════════════

setup: check-node check-docker
	@echo "=== DreamAcademy Local Setup ==="
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
	@$(MAKE) wait-mysql
	@echo "Running migrations..."
	npm run db:migrate
	@echo "Seeding database..."
	npx tsx db/seed.ts
	@echo "=== Setup complete. Run 'make dev' to start the server ==="

dev: check-node
	@echo "Starting dev server on http://localhost:$(APP_PORT)"
	npm run dev

build: check-node
	npm run build

start: check-node
	NODE_ENV=production npm run start

# ═══════════════════════════════════════════════════════════════
#  DOCKER COMPOSE
# ═══════════════════════════════════════════════════════════════

docker-up:
	@if [ ! -f .env ]; then \
		echo "ERROR: .env not found. Copy .env.example to .env and fill it in."; \
		exit 1; \
	fi
	docker-compose up -d

docker-down:
	docker-compose down

docker-build:
	docker-compose build --no-cache

# ═══════════════════════════════════════════════════════════════
#  DATABASE
# ═══════════════════════════════════════════════════════════════

db-up:
	docker-compose up -d db
	@echo "MySQL started on port $(DB_PORT). Run 'make wait-mysql' to check readiness."

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
	@$(MAKE) wait-mysql
	$(MAKE) db-migrate
	$(MAKE) db-seed

wait-mysql:
	@echo "Waiting for MySQL to accept connections..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if docker-compose exec -T db mysqladmin ping -h localhost --silent 2>/dev/null; then \
			echo "MySQL is ready!"; \
			exit 0; \
		fi; \
		echo "Attempt $$i/10... waiting 5s"; \
		sleep 5; \
	done; \
	echo "MySQL did not become ready in time. Check logs: make logs-db"; \
	exit 1

# ═══════════════════════════════════════════════════════════════
#  MONITORING
# ═══════════════════════════════════════════════════════════════

logs:
	docker-compose logs -f

logs-app:
	docker-compose logs -f app

logs-db:
	docker-compose logs -f db

status:
	@echo "=== Container Status ==="
	docker-compose ps
	@echo ""
	@echo "=== Disk Usage ==="
	docker system df

# ═══════════════════════════════════════════════════════════════
#  TESTING & QUALITY
# ═══════════════════════════════════════════════════════════════

test: check-node
	npx playwright test

lint: check-node
	npm run lint

# ═══════════════════════════════════════════════════════════════
#  UTILITY
# ═══════════════════════════════════════════════════════════════

clean:
	rm -rf node_modules dist
	docker-compose down -v
	@echo "Cleaned node_modules, dist, and docker volumes."

check-node:
	@node -v >/dev/null 2>&1 || (echo "ERROR: Node.js $(NODE_VERSION)+ is required." && exit 1)
	@node -e "const v=process.version.slice(1).split('.'); if(v[0]<20) { console.error('ERROR: Node.js 20+ required, found '+process.version); process.exit(1) }" 2>/dev/null

check-docker:
	@docker -v >/dev/null 2>&1 || (echo "ERROR: Docker is required." && exit 1)
