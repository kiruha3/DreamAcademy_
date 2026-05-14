# DreamDocs Academy — Windows Setup Script
# Usage: .\setup.ps1 [Command]
#   .\setup.ps1 setup    — full first-time setup
#   .\setup.ps1 dev      — start dev server
#   .\setup.ps1 docker-up — start production via Docker Compose

param(
    [Parameter(Position=0)]
    [ValidateSet("setup", "dev", "build", "start", "db-up", "db-down", "db-migrate", "db-seed", "db-reset", "docker-up", "docker-down", "docker-build", "test", "lint", "clean", "help")]
    [string]$Command = "help"
)

$AppPort = 3000
$DbPort = 3306

function Test-Node {
    try {
        $ver = node -v 2>$null
        if (-not $ver) { throw }
        $major = [int]($ver -replace '^v','' -split '\.')[0]
        if ($major -lt 20) {
            Write-Host "ERROR: Node.js 20+ required, found $ver" -ForegroundColor Red
            exit 1
        }
    }
    catch {
        Write-Host "ERROR: Node.js 20+ is required." -ForegroundColor Red
        exit 1
    }
}

function Test-Docker {
    try {
        docker -v >$null 2>&1
        if (-not $?) { throw }
    }
    catch {
        Write-Host "ERROR: Docker is required for database." -ForegroundColor Red
        exit 1
    }
}

function Invoke-Setup {
    Test-Node
    Test-Docker

    Write-Host "=== DreamDocs Academy setup ===" -ForegroundColor Cyan

    Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
    npm install

    if (-not (Test-Path .env)) {
        Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
        Copy-Item .env.example .env
        Write-Host "!!! EDIT .env BEFORE CONTINUING (especially APP_SECRET, DATABASE_URL) !!!" -ForegroundColor Red
        exit 1
    }

    Write-Host "Starting MySQL..." -ForegroundColor Yellow
    docker-compose up -d db

    Write-Host "Waiting for MySQL to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    Write-Host "Running migrations..." -ForegroundColor Yellow
    npm run db:migrate

    Write-Host "Seeding database..." -ForegroundColor Yellow
    npx tsx db/seed.ts

    Write-Host "=== Setup complete. Run '.\setup.ps1 dev' to start the server ===" -ForegroundColor Green
}

function Invoke-Dev {
    Test-Node
    Write-Host "Starting dev server on http://localhost:$AppPort" -ForegroundColor Cyan
    npm run dev
}

function Invoke-Build {
    Test-Node
    npm run build
}

function Invoke-Start {
    Test-Node
    $env:NODE_ENV = "production"
    npm run start
}

function Invoke-DbUp {
    Test-Docker
    docker-compose up -d db
    Write-Host "MySQL started on port $DbPort. Wait ~10s before migrating." -ForegroundColor Green
}

function Invoke-DbDown {
    docker-compose down db
}

function Invoke-DbMigrate {
    Test-Node
    npm run db:migrate
}

function Invoke-DbSeed {
    Test-Node
    npx tsx db/seed.ts
}

function Invoke-DbReset {
    Invoke-DbDown
    Write-Host "Removing MySQL volume..." -ForegroundColor Yellow
    docker volume rm dreamdocs_academy_mysql_data 2>$null
    Invoke-DbUp
    Start-Sleep -Seconds 10
    Invoke-DbMigrate
    Invoke-DbSeed
}

function Invoke-DockerUp {
    if (-not (Test-Path .env)) {
        Write-Host "ERROR: .env not found. Copy .env.example to .env and fill it in." -ForegroundColor Red
        exit 1
    }
    docker-compose up --build -d
}

function Invoke-DockerDown {
    docker-compose down
}

function Invoke-DockerBuild {
    docker-compose build --no-cache
}

function Invoke-Test {
    Test-Node
    npx playwright test
}

function Invoke-Lint {
    Test-Node
    npm run lint
}

function Invoke-Clean {
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
    Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
    docker-compose down -v
}

function Show-Help {
    Write-Host @"
DreamDocs Academy — Setup Commands
==================================
  setup       Full first-time setup (install, db, migrate, seed)
  dev         Start dev server (port 3000)
  build       Production build
  start       Start production server
  db-up       Start MySQL in Docker
  db-down     Stop MySQL
  db-migrate  Run Drizzle migrations
  db-seed     Seed database with demo data
  db-reset    Reset database (down + up + migrate + seed)
  docker-up   Start full stack via Docker Compose
  docker-down Stop Docker Compose stack
  docker-build Rebuild Docker images
  test        Run Playwright E2E tests
  lint        Run TypeScript check
  clean       Remove node_modules, dist, Docker volumes

Examples:
  .\setup.ps1 setup
  .\setup.ps1 dev
  .\setup.ps1 docker-up
"@ -ForegroundColor Cyan
}

switch ($Command) {
    "setup"       { Invoke-Setup }
    "dev"         { Invoke-Dev }
    "build"       { Invoke-Build }
    "start"       { Invoke-Start }
    "db-up"       { Invoke-DbUp }
    "db-down"     { Invoke-DbDown }
    "db-migrate"  { Invoke-DbMigrate }
    "db-seed"     { Invoke-DbSeed }
    "db-reset"    { Invoke-DbReset }
    "docker-up"   { Invoke-DockerUp }
    "docker-down" { Invoke-DockerDown }
    "docker-build"{ Invoke-DockerBuild }
    "test"        { Invoke-Test }
    "lint"        { Invoke-Lint }
    "clean"       { Invoke-Clean }
    "help"        { Show-Help }
    default       { Show-Help }
}
