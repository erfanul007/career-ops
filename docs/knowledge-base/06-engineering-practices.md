# Engineering Practices

The standing working agreement for building CareerOps. The PRD says *what*; `01`–`05` say
*how* per area; this doc says *how we work* — the cross-cutting rules every slice obeys. These
rules are binding and seeded into `CLAUDE.md` (see `04-conventions.md`).

## CLI-first (Decision D19)

Use the official tooling to change project structure, dependencies, and migrations. Do not
hand-author the files those tools own.

**Backend — use the `dotnet` CLI for:**
- Creating solutions and projects (`dotnet new sln`, `dotnet new classlib|web|xunit`).
- Project references (`dotnet add reference`) and solution membership (`dotnet sln add`).
- NuGet packages (`dotnet add package` / `remove`) — never hand-edit `<PackageReference>` lines.
- EF Core migrations (`dotnet ef migrations add` / `database update` / `migrations remove`).
- The local tool manifest (`dotnet new tool-manifest`, `dotnet tool install`).
- Running tests (`dotnet test`) and formatting (`dotnet format`).

**Frontend — use `npm` / the project CLIs for:**
- Scaffolding (`npm create vite`), dependencies (`npm install` — never hand-edit version
  strings in `package.json`).
- Component and library setup via their CLIs (`npx shadcn add`, `npx orval`).

**Hand-editing is correct for:** source code; config files the CLIs do not own
(`appsettings*.json`, `Directory.Build.props` shared properties, `vite.config.ts`,
`orval.config.ts`, the `package.json` *scripts* block); and trimming boilerplate a template
emits (e.g. deleting `Class1.cs`).

**Why:** reproducible setup, correct version resolution, fewer transcription mistakes, and a
history that another engineer can replay.

## Architecture & pragmatic DDD (Decisions D3, D18)

Clean Architecture (inward dependencies; see `01-architecture.md`) with **pragmatic / tactical
DDD**. We model the domain in the language of the PRD and put invariants in the domain — but we
do **not** add DDD ceremony the personal-use baseline does not need.

**We do:**
- Use the **ubiquitous language** from the PRD (`Company`, `JobLead`, `Application`,
  `Interview`, `FollowUpTask`, `ResumeVariant`, `Contact`, `UserProfile`).
- Treat aggregates as **consistency boundaries**: e.g. an `Application` owns its `Interview`s;
  cross-aggregate links are by **id**, not by navigation where it would blur the boundary.
- Put **state-transition behaviour on entities** where it earns its place (e.g. the lead
  auto-advance mapping of D6 reads as a domain method, not scattered service mutation).
- Introduce **value objects only when they remove real duplication or scattered validation**
  (a `Money`/salary value object is a candidate later — not forced now).

**We do not (until a slice genuinely needs it):**
- Repositories or `IRepository<T>` — query `IAppDbContext` directly (D3).
- MediatR / CQRS buses, domain-event infrastructure, or a unit-of-work abstraction beyond
  `IAppDbContext`.
- Anemic-everywhere models *or* gold-plated aggregates. Aim for the middle: behaviour where it
  protects an invariant, plain data where it does not.

## Clean code

- **KISS:** choose the simplest design that satisfies the current slice. When two solutions
  both work, take the one with fewer moving parts.
- **YAGNI:** build only what the current delivery state needs. No speculative configuration,
  abstraction, parameters, or endpoints for futures not yet in scope.
- **No bloat:** no dead code, no commented-out code, no unused parameters or packages.
- **Comments earn their place:** comment the non-obvious *why*, never the *what*. Delete
  planning/temporal comments ("S1.2 adds X here") before the code is final.
- **Small, focused units:** one clear responsibility per file/class/function. When a file grows
  unwieldy, split by responsibility. Prefer code you can hold in context at once.
- **Consistency:** match the naming, structure, and idioms already established in `04`.

## Folder structure

Organise **by aggregate within each layer** (not by technical type), so a feature's code lives
together and the structure extends cleanly as aggregates are added. Layer-specific layouts are
in `01-architecture.md` (backend) and `04-conventions.md` (frontend + Api infra folders).

## Collaboration rules

- **No silent decisions.** Any choice with alternatives or trade-offs is surfaced, not assumed.
- **Debate for the better solution.** If a simpler/cleaner/more correct option than the plan or
  a request exists, raise it with reasoning before proceeding.
- **Ask until clear.** When a requirement is ambiguous, uncertain, or risky, ask a focused
  question before building — partial understanding produces wrong work.
- **Record decisions.** Every locked choice gets a dated entry in `03-decisions.md`; a decision
  changes only by a new dated entry, never silently.
- **Keep docs consistent.** When a decision changes how we build, update the affected KB docs in
  the same change so the knowledge base stays correct.
