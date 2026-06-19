# Feedback Loop

How we keep the delivery lifecycle fast and the feedback cycle short. This is the operational
heart of the design — every choice here serves "edit → see it working" speed.

## Runtime topology (Decisions D10, D11)

This is **Docker-backed local development**, not fully Docker-first: the backend and
PostgreSQL run through Docker Compose for parity and a clean fresh-clone story, while the
frontend runs on host Vite for fast HMR. A production frontend Dockerfile is intentionally
deferred. (Phrase it this way in the README so reviewers don't read "frontend isn't in Docker"
as an omission.)

```
docker compose (deploy/compose/docker-compose.yml)
  ├─ careerops-postgres  :5432   volume-backed, health-checked
  └─ careerops-api       :8080   health-checked, Swagger at /swagger

host (no Docker)
  ├─ API inner loop      dotnet watch  →  talks to :5432
  └─ frontend            Vite dev      :5173  →  talks to API :8080
```

- **Postgres** always in Docker (zero local install friction).
- **API**: containerized for the fresh-clone proof *and* runnable on the host via
  `dotnet watch` for fast reloads. Both hit the same dockerized Postgres.
- **Frontend**: always on the host. Native Vite HMR — instant, reliable, no bind-mount
  watching. Self-contained under `frontend/` (Decision D10).

## The three loops

| Loop | Command | Speed | Use for |
|------|---------|-------|---------|
| **Backend inner** | `just api` (`dotnet watch`) | sub-second | active backend coding |
| **Frontend inner** | `just web` (Vite) | instant HMR | active frontend coding |
| **Full-stack / parity** | `just up` (compose: pg + api) | image build | fresh-clone proof, integration, "does it containerize" |

Daily development: `just up` once to get Postgres (and the baseline API) running, then
`just api` + `just web` on the host for the fast inner loops. Use the compose API alone when
verifying the containerized build.

## `justfile` commands

```
just up         # docker compose up: postgres + api (fresh-clone / parity)
just down       # stop the stack
just build      # build api image
just logs       # tail compose logs
just api        # dotnet watch the API on host (fast backend loop)
just web        # cd frontend && vite dev (fast frontend loop)
just gen-client # regenerate the orval client from the API OpenAPI doc
just test       # run backend tests (and frontend tests once they exist)
just verify     # CI-like local gate: backend build + test, frontend typecheck/build,
                #   (later) generated-client freshness check. The per-slice gate from Phase 1.
just format     # dotnet format + frontend lint/format
just migrate    # add/apply EF Core migration
just db-reset   # drop + recreate the dev database
```

(`just up`/`just web` together replace the PRD's single-command run — the deliberate cost of
a separately deployable frontend.)

## The orval contract loop (Decision D4)

The generated client **is** the backend↔frontend contract. The loop:

```
1. change a Minimal-API endpoint (with its operationId)
2. API is running (just up or just api) → OpenAPI doc at http://localhost:8080/swagger/v1/swagger.json
3. just gen-client  → orval regenerates lib/api/ (typed client + query hooks + Zod)
4. TypeScript immediately flags every frontend call that no longer matches
5. fix the call sites; commit the regenerated client with the change
```

- `lib/api/` is generated output — **never hand-edit**; commit it so diffs are reviewable and
  CI (Phase 8) can fail on a stale client.
- Endpoints **must** carry `operationId`s (`04-conventions.md`) or the generated hooks are
  unusable.
- **Escape hatch (time-boxed — Decision D4):** if orval is not generating a clean client by
  the end of **S1.2**, fall back to openapi-typescript (types-only) + a thin fetch wrapper.
  Do not spend more than **half a day** fighting client generation. The contract discipline
  stays the same either way.

## Hot reload notes
- Backend: `dotnet watch` on the host — native, fast, no Docker file-watching.
- Frontend: Vite HMR on the host — native, fast.
- Because nothing dev-critical runs with Docker bind mounts, the Windows/WSL2 inotify
  flakiness that plagues containerized watchers does not apply here.

## Per-slice Definition of Done (the short-cycle contract)

Every slice (see `02-delivery-plan.md`) is "done" only when:

1. Backend builds; `just up` runs the stack; the slice's endpoints respond.
2. `just gen-client` run; generated client committed; the frontend page works against the
   real API.
3. Data persists across a container restart (where the slice touches persistence).
4. Bad input returns the correct `ProblemDetails`.
5. `just verify` passes (build + tests + frontend typecheck) — the CI-like local gate.
6. Phase-appropriate tests pass (`just test`).
7. A manual usability check confirms the slice supports the real job-search workflow.

This is what keeps the cycle short: a slice is never "in progress across the stack" — it is
runnable and reviewable, or it is not done.

## Test cadence
Light early, growing (PRD §25). Phase 1–2: health + migration smoke + domain validation.
Phase 3–5: dashboard rules (via `IClock`), status transitions, lead auto-advance. Phase 6:
mock AI. Phase 8: fill gaps + CI runs the suite. Do not build large suites before the product
is usable (PRD §19.2).

## CI (arrives Phase 8 — Decision D8)
GitHub Actions: backend build + `just test`, frontend build + a `gen-client` freshness check,
Docker image build. Until then, `just test` locally per slice is the gate.
