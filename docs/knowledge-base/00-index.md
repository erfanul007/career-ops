# CareerOps Knowledge Base

The living reference for building CareerOps. The PRD defines *what* and *why*; this
knowledge base defines *how* — the architecture, conventions, plan, and workflow that
coding agents and humans follow day to day.

## Read order

| Doc | Purpose | Read when |
|-----|---------|-----------|
| [`01-architecture.md`](01-architecture.md) | Layers, dependency rules, patterns, the standard request flow | Before writing any backend code |
| [`02-delivery-plan.md`](02-delivery-plan.md) | Phases → vertical slices, scope, acceptance, Definition of Done | Before starting a slice |
| [`03-decisions.md`](03-decisions.md) | ADR-lite log: every locked decision with rationale + rejected alternatives | When questioning or changing a decision |
| [`04-conventions.md`](04-conventions.md) | Naming, enums-as-int, snake_case, UTC, validation, error envelope, folders | While writing code |
| [`05-feedback-loop.md`](05-feedback-loop.md) | Dev runtime, `just` commands, orval, hot reload, test cadence, per-slice DoD | While iterating |

## Source documents

- **Product scope:** [`../CareerOps-PRD.md`](../CareerOps-PRD.md) — the authority on features, scope, and domain model.
- **Design record:** [`../superpowers/specs/2026-06-19-careerops-delivery-plan-design.md`](../superpowers/specs/2026-06-19-careerops-delivery-plan-design.md) — point-in-time design and *why* behind the decisions.

## Precedence

1. The **PRD** governs product scope and the domain model.
2. This **knowledge base** governs how we build it. Where it conflicts with the design
   spec on operational detail, the knowledge base wins (it is the living version).
3. A decision changes only by updating [`03-decisions.md`](03-decisions.md) with a new
   dated entry — never silently.

## One-line summary of the build approach

Thin **vertical slices** (entity → migration → Minimal-API → orval client → React page),
each runnable and usable the day it lands; a **tracer bullet** proves the toolchain first;
**simpler-first** always, with documented escape hatches to heavier options.

## Where to find the standing rules

The **Implementation Guardrails** (the seed copied into `CLAUDE.md` at S0.1) live at the end
of [`04-conventions.md`](04-conventions.md). Manual AI prompt export lands early as **S3.4**
(before any real provider) — see [`02-delivery-plan.md`](02-delivery-plan.md) and decision
**D13**.
