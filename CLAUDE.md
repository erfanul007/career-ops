# CLAUDE.md — CareerOps coding-agent instructions

Read the knowledge base before coding: `docs/knowledge-base/00-index.md` (then 01–06).
The PRD (`docs/CareerOps-PRD.md`) governs scope; the knowledge base governs how we build.
The working agreement (CLI-first, clean code, pragmatic DDD, no silent decisions) is `06`.
Locked decisions live in `docs/knowledge-base/03-decisions.md` — never change one silently;
add a dated entry instead.

## PRD §9.2 instructions
- Follow the PRD. Keep scope small. Prefer useful delivery over perfect abstraction.
- Do not add features without explicit approval.
- Do not introduce SaaS/multi-user complexity.
- Do not add RabbitMQ, Redis, Kubernetes, or auth in the MVP.
- Use Clean Architecture but avoid ceremony.
- Use EF Core code-first migrations. Maintain the Docker-backed workflow.
- Keep the frontend simple, modern, and usable.

## Implementation guardrails
Do not optimize for theoretical SaaS users.
Do not add infrastructure unless a current slice requires it.
Every slice must be usable from the UI and pass `just verify`.
Prefer archive/status changes over destructive delete in UX.
On delete, clean up loose-reference rows (FollowUpTask, AiAnalysis) — no orphans.
If orval blocks progress for more than half a day, use the documented fallback.
Add the manual AI prompt export (S3.4) before any real AI provider integration.
Never reorder or renumber an existing enum member's integer value.
Inject IClock; never call DateTime.UtcNow directly in app/domain code.
Use the dotnet CLI for project/solution/package/migration ops and npm/vite/shadcn/orval for
frontend scaffolding and deps — do not hand-author .sln/.csproj or package.json versions (D19).
Follow Clean Architecture + pragmatic/tactical DDD: no repositories, MediatR, or domain-event
infra until a slice needs them (D3, D18).
Clean code: KISS and YAGNI; no dead code, commented-out code, or needless comments; small
focused files; comment the non-obvious why, never the what.
No silent decisions: debate the better option, ask when unclear, and log every decision in
03-decisions.md.
Push back on: auth, multi-user, MediatR/CQRS, generic repositories, RabbitMQ/Redis/
Kubernetes, scraping, browser extension, calendar/email, vector DB/RAG, file upload —
before the personal-use baseline works (PRD §7.3, §19.1).
