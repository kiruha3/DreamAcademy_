# DreamAcademy — Makefile
# One-command deploy that auto-detects local vs Docker MySQL.
#
#  🚀 SERVER (production):
#    make server-install   — first deploy (auto-detects DB, builds, migrates, seeds, starts)
#    make deploy           — update (pull, build, migrate, restart)
#    make logs             — watch logs
#    make status           — container status
#
#  💻 LOCAL DEV:
#    make setup            — install deps, start DB, migrate, seed
#    make dev              — Vite dev server
#
#  🐳 DOCKER ONLY:
#    make docker-up        — start stack
#    make docker-down      — stop stack
#
#  🗄️ DB:
#    make db-migrate       — run Drizzle migrations
#    make db-seed          — seed initial data
#    make db-reset         — wipe Docker DB volume & re-create
#
#  🔧 UTILS:
#    make clean            — nuke node_modules, dist, docker volumes
#    make test             — Playwright E2E
#    make lint             — tsc --noEmit

.PHONY: setup dev build start server-install deploy docker-up docker-down \
        db-migrate db-seed db-reset wait-mysql wait-local-mysql logs logs-app \
        status test lint clean check-node check-docker

NODE_VERSION := 20
APP_PORT     := 3000
GIT_REPO     := https://github.com/kiruha3/DreamAcademy_.git

# ───────────────────────────────────────────────────────────────
#  SERVER INSTALL — one command, works on fresh server
# ───────────────────────────────────────────────────────────────
server-install: check-docker
	@echo "╔══════════════════════════════════════════════════════════════════════╗"
	@echo "║         DreamAcademy — Server Install                                ║"
	@echo "╚══════════════════════════════════════════════════════════════════════╝"

	@if [ ! -d .git ]; then \
		echo "→ Cloning repository..."; \
		git clone $(GIT_REPO) .tmp_clone 2>/dev/null; \
		mv .tmp_clone/.git . 2>/dev/null || true; \
		mv .tmp_clone/* .tmp_clone/.* . 2>/dev/null || true; \
		rm -rf .tmp_clone; \
	fi

	@if [ ! -f .env ]; then \
		echo "→ Creating .env from .env.example..."; \
		cp .env.example .env; \
		echo ""; \
		echo "⚠️  EDIT .env BEFORE CONTINUING!"; \
		echo "   Required: APP_SECRET, DATABASE_URL, S3_*, OWNER_UNION_ID"; \
		echo ""; \
		exit 1; \
	fi

	@echo "→ Installing dependencies..."
	npm ci

	@echo "→ Building application..."
	npm run build

	@echo "→ Detecting database..."
	@DB_URL=$$(grep '^DATABASE_URL=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'"); \
	if echo "$$DB_URL" | grep -qE '(localhost|127\.0\.0\.1)'; then \
		echo "   DATABASE_URL points to localhost — checking port 3306..."; \
		if timeout 3 bash -c 'cat < /dev/null > /dev/tcp/localhost/3306' 2>/dev/null; then \
			echo "   ✅ Local MySQL is running — using LOCAL DB mode"; \
			$(MAKE) _server-install-local; \
		else \
			echo "   ❌ Local MySQL not responding — using DOCKER DB mode"; \
			$(MAKE) _server-install-docker; \
		fi; \
	else \
		echo "   DATABASE_URL is remote/docker — using DOCKER DB mode"; \
		$(MAKE) _server-install-docker; \
	fi

# Private target: local DB (no db container, only app)
_server-install-local:
	@echo "→ Waiting for local MySQL to be ready..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if timeout 3 bash -c 'cat < /dev/null > /dev/tcp/localhost/3306' 2>/dev/null; then \
			echo "   ✅ MySQL ready"; \
			break; \
		fi; \
		echo "   Attempt $$i/10... waiting 3s"; \
		sleep 3; \
		done

	@echo "→ Running migrations..."
	npx drizzle-kit migrate

	@echo "→ Seeding database..."
	npx tsx db/seed.ts

	@echo "→ Starting application container..."
	docker compose -f docker-compose.local-db.yml up -d app

	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════════════╗"
	@echo "║  ✅ Install complete (LOCAL DB mode)                                 ║"
	@echo "║     App: http://localhost:$(APP_PORT)                                ║"
	@echo "╚══════════════════════════════════════════════════════════════════════╝"

# Private target: Docker DB (full stack with db container)
_server-install-docker:
	@echo "→ Starting Docker stack (app + db)..."
	docker compose -f docker-compose.yml up -d db

	@echo "→ Waiting for Docker MySQL..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if docker compose -f docker-compose.yml exec -T db mysqladmin ping -h localhost --silent 2>/dev/null; then \
			echo "   ✅ Docker MySQL ready"; \
			exit 0; \
		fi; \
		echo "   Attempt $$i/10... waiting 5s"; \
		sleep 5; \
	done; \
	echo "❌ MySQL did not become ready. Check: make logs-db"; \
	exit 1

	@echo "→ Running migrations..."
	npx drizzle-kit migrate

	@echo "→ Seeding database..."
	npx tsx db/seed.ts

	@echo "→ Starting application container..."
	docker compose -f docker-compose.yml up -d app

	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════════════╗"
	@echo "║  ✅ Install complete (DOCKER DB mode)                                ║"
	@echo "║     App: http://localhost:$(APP_PORT)                                ║"
	@echo "╚══════════════════════════════════════════════════════════════════════╝"

# ───────────────────────────────────────────────────────────────
#  DEPLOY — update running server
# ───────────────────────────────────────────────────────────────
deploy: check-docker
	@echo "╔══════════════════════════════════════════════════════════════════════╗"
	@echo "║         DreamAcademy — Deploy Update                                 ║"
	@echo "╚══════════════════════════════════════════════════════════════════════╝"

	@echo "→ Pulling latest code..."
	git pull origin master 2>/dev/null || git pull origin main

	@echo "→ Installing dependencies..."
	npm ci

	@echo "→ Building application..."
	npm run build

	@echo "→ Detecting database mode..."
	@DB_URL=$$(grep '^DATABASE_URL=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'"); \
	if echo "$$DB_URL" | grep -qE '(localhost|127\.0\.0\.1)'; then \
		if timeout 3 bash -c 'cat < /dev/null > /dev/tcp/localhost/3306' 2>/dev/null; then \
			echo "   Using LOCAL DB mode"; \
			$(MAKE) _deploy-local; \
		else \
			echo "   Using DOCKER DB mode"; \
			$(MAKE) _deploy-docker; \
		fi; \
	else \
		echo "   Using DOCKER DB mode"; \
		$(MAKE) _deploy-docker; \
	fi

_deploy-local:
	@echo "→ Stopping old app container..."
	docker compose -f docker-compose.local-db.yml down app

	@echo "→ Running migrations..."
	npx drizzle-kit migrate

	@echo "→ Starting updated app..."
	docker compose -f docker-compose.local-db.yml up -d app

	@echo "→ Cleaning old images..."
	docker system prune -f

	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════════════╗"
	@echo "║  ✅ Deploy complete (LOCAL DB)                                       ║"
	@echo "╚══════════════════════════════════════════════════════════════════════╝"
	@$(MAKE) status

_deploy-docker:
	@echo "→ Stopping old stack..."
	docker compose -f docker-compose.yml down

	@echo "→ Starting updated stack..."
	docker compose -f docker-compose.yml up -d db

	@echo "→ Waiting for MySQL..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if docker compose -f docker-compose.yml exec -T db mysqladmin ping -h localhost --silent 2>/dev/null; then \
			echo "   ✅ MySQL ready"; \
			exit 0; \
		fi; \
		echo "   Attempt $$i/10... waiting 5s"; \
		sleep 5; \
	done; \
	echo "❌ MySQL timeout"; \
	exit 1

	@echo "→ Running migrations..."
	npx drizzle-kit migrate

	@echo "→ Starting app..."
	docker compose -f docker-compose.yml up -d app

	@echo "→ Cleaning old images..."
	docker system prune -f

	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════════════╗"
	@echo "║  ✅ Deploy complete (DOCKER DB)                                      ║"
	@echo "╚══════════════════════════════════════════════════════════════════════╝"
	@$(MAKE) status

# ───────────────────────────────────────────────────────────────
#  LOCAL DEVELOPMENT
# ───────────────────────────────────────────────────────────────
setup: check-node check-docker
	@echo "=== DreamAcademy Local Setup ==="
	npm install
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "⚠️  EDIT .env BEFORE CONTINUING (APP_SECRET, DATABASE_URL)"; \
		exit 1; \
	fi
	@DB_URL=$$(grep '^DATABASE_URL=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'"); \
	if echo "$$DB_URL" | grep -qE '(localhost|127\.0\.0\.1)'; then \
		if timeout 3 bash -c 'cat < /dev/null > /dev/tcp/localhost/3306' 2>/dev/null; then \
			echo "Local MySQL detected"; \
		else \
			echo "Starting Docker DB for dev..."; \
			docker compose -f docker-compose.yml up -d db; \
			$(MAKE) wait-mysql; \
		fi; \
	else \
		docker compose -f docker-compose.yml up -d db; \
		$(MAKE) wait-mysql; \
	fi
	npm run db:migrate
	npx tsx db/seed.ts
	@echo "=== Setup complete. Run 'make dev' ==="

dev: check-node
	@echo "Starting dev server on http://localhost:$(APP_PORT)"
	npm run dev

build: check-node
	npm run build

start: check-node
	NODE_ENV=production npm run start

# ───────────────────────────────────────────────────────────────
#  DOCKER
# ───────────────────────────────────────────────────────────────
docker-up:
	@DB_URL=$$(grep '^DATABASE_URL=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'"); \
	if echo "$$DB_URL" | grep -qE '(localhost|127\.0\.0\.1)'; then \
		if timeout 3 bash -c 'cat < /dev/null > /dev/tcp/localhost/3306' 2>/dev/null; then \
			docker compose -f docker-compose.local-db.yml up -d; \
		else \
			docker compose -f docker-compose.yml up -d; \
		fi; \
	else \
		docker compose -f docker-compose.yml up -d; \
	fi

docker-down:
	@docker compose -f docker-compose.yml down 2>/dev/null || true
	@docker compose -f docker-compose.local-db.yml down 2>/dev/null || true

# ───────────────────────────────────────────────────────────────
#  DATABASE
# ───────────────────────────────────────────────────────────────
db-migrate: check-node
	npx drizzle-kit migrate

db-seed: check-node
	npx tsx db/seed.ts

db-reset:
	@echo "Removing Docker DB volume..."
	docker volume rm dreamdocs_academy_mysql_data 2>/dev/null || true
	@DB_URL=$$(grep '^DATABASE_URL=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'"); \
	if echo "$$DB_URL" | grep -qE '(localhost|127\.0\.0\.1)'; then \
		if timeout 3 bash -c 'cat < /dev/null > /dev/tcp/localhost/3306' 2>/dev/null; then \
			echo "Local MySQL detected — manual reset required"; \
		else \
			docker compose -f docker-compose.yml up -d db; \
			$(MAKE) wait-mysql; \
		fi; \
	else \
		docker compose -f docker-compose.yml up -d db; \
		$(MAKE) wait-mysql; \
	fi
	$(MAKE) db-migrate
	$(MAKE) db-seed

wait-mysql:
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		if docker compose -f docker-compose.yml exec -T db mysqladmin ping -h localhost --silent 2>/dev/null; then \
			echo "MySQL is ready!"; \
			exit 0; \
		fi; \
		echo "Attempt $$i/10... waiting 5s"; \
		sleep 5; \
	done; \
	echo "❌ MySQL timeout. Check: make logs-db"; \
	exit 1

# ───────────────────────────────────────────────────────────────
#  MONITORING
# ───────────────────────────────────────────────────────────────
logs:
	@DB_URL=$$(grep '^DATABASE_URL=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'"); \
	if echo "$$DB_URL" | grep -qE '(localhost|127\.0\.0\.1)'; then \
		if timeout 3 bash -c 'cat < /dev/null > /dev/tcp/localhost/3306' 2>/dev/null; then \
			docker compose -f docker-compose.local-db.yml logs -f; \
		else \
			docker compose -f docker-compose.yml logs -f; \
		fi; \
	else \
		docker compose -f docker-compose.yml logs -f; \
	fi

logs-app:
	@DB_URL=$$(grep '^DATABASE_URL=' .env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'"); \
	if echo "$$DB_URL" | grep -qE '(localhost|127\.0\.0\.1)'; then \
		if timeout 3 bash -c 'cat < /dev/null > /dev/tcp/localhost/3306' 2>/dev/null; then \
			docker compose -f docker-compose.local-db.yml logs -f app; \
		else \
			docker compose -f docker-compose.yml logs -f app; \
		fi; \
	else \
		docker compose -f docker-compose.yml logs -f app; \
	fi

status:
	@echo "=== Containers ==="
	@docker compose -f docker-compose.yml ps 2>/dev/null || true
	@docker compose -f docker-compose.local-db.yml ps 2>/dev/null || true
	@echo ""
	@echo "=== Disk ==="
	docker system df

# ───────────────────────────────────────────────────────────────
#  TESTING & QUALITY
# ───────────────────────────────────────────────────────────────
test: check-node
	npx playwright test

lint: check-node
	npm run lint

# ───────────────────────────────────────────────────────────────
#  UTILITY
# ───────────────────────────────────────────────────────────────
clean:
	rm -rf node_modules dist
	@docker compose -f docker-compose.yml down -v 2>/dev/null || true
	@docker compose -f docker-compose.local-db.yml down -v 2>/dev/null || true
	@echo "Cleaned."

check-node:
	@node -v >/dev/null 2>&1 || (echo "ERROR: Node.js $(NODE_VERSION)+ is required." && exit 1)
	@node -e "const v=process.version.slice(1).split('.'); if(v[0]<20){console.error('ERROR: Node.js 20+ required, found '+process.version); process.exit(1)}" 2>/dev/null

check-docker:
	@docker -v >/dev/null 2>&1 || (echo "ERROR: Docker is required." && exit 1)
