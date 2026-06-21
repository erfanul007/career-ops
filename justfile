set dotenv-load := true
set windows-shell := ["cmd.exe", "/c"]
compose := "deploy/compose/docker-compose.yml"
sln := "backend/CareerOps.slnx"

# list available recipes
default:
    @just --list

# --- full stack / parity ---

up:
    docker compose -f {{compose}} up --build --remove-orphans -d

down:
    docker compose -f {{compose}} down

build:
    docker compose -f {{compose}} build

logs:
    docker compose -f {{compose}} logs -f

# --- inner loops (host) ---

api:
    dotnet watch --project backend/src/CareerOps.Presentation run

web:
    cd frontend && npm run dev

gen-client:
    cd frontend && npm run gen:client

# --- quality gates ---

test:
    dotnet test {{sln}}

format:
    dotnet format {{sln}} && cd frontend && npm run lint

verify:
    dotnet build {{sln}} && dotnet test {{sln}} && cd frontend && npm run typecheck && npm run build

# --- database ---

migrate name="":
    dotnet ef migrations add {{name}} --project backend/src/CareerOps.Infrastructure --startup-project backend/src/CareerOps.Presentation --output-dir Persistence/Migrations

db-reset:
    docker compose -f {{compose}} down -v && docker compose -f {{compose}} up -d careerops-postgres
