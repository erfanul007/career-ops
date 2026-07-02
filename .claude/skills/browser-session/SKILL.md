---
name: browser-session
description: Use when a task needs a logged-in or JS-heavy browser session (LinkedIn, Glassdoor, Wellfound, any job portal) via chrome-devtools MCP — covers preflight, :9222 bootstrap, login walls, and any temptation to fall back to logged-out WebSearch/WebFetch.
---

# Browser Session (chrome-devtools MCP)

Shared infra for every logged-in platform search (`search-linkedin`, `search-glassdoor`, …). Public pages need none of this — use `WebFetch`/`WebSearch` directly.

**Preflight — run BEFORE any logged-in platform step. Two independent failures, different fixes:**
1. **chrome-devtools tools loaded?** Confirm `mcp__chrome-devtools__*` is actually available (ToolSearch `select:mcp__chrome-devtools__list_pages`). If ABSENT → the MCP server didn't connect this session and **you cannot load it yourself**. STOP, tell the user, ask them to enable it (`/mcp` approve `chrome-devtools`, or restart `claude --continue` with the CareerOps Chrome open); resume on confirmation. Absent tools ≠ unsupported task — it's a fixable connection failure, NOT a cue to switch modes.
2. **`:9222` up?** Tools present → probe the port; if down, run the bootstrap below.

**No silent fallback (hard rule).** If the logged-in path (chrome-devtools MCP + `:9222`) is unavailable, NEVER quietly drop to logged-out `WebSearch`/`WebFetch` or a non-session browser (e.g. containerized Playwright — it has no login). Name the gap and **ask permission** first. If the user OKs logged-out mode: tag every saved row `source=guest/logged-out`, treat post-dates as `fresh=unknown`, and queue a logged-in re-run to supersede. Red flag — catching yourself think *"the tool isn't there, I'll just use WebSearch"* IS the silent-fallback failure: STOP and ask.

**Bootstrap `:9222` (PowerShell).** Profile **CareerOps** · user-data-dir `C:\Users\LENOVO\.chrome-mcp-debug` · profile-directory `Profile`.
1. **Probe** `Invoke-RestMethod http://127.0.0.1:9222/json/version` → answers? use it.
2. **Down → open** (Chrome auto-creates dir/profile if missing): `Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--remote-debugging-port=9222','--user-data-dir=C:\Users\LENOVO\.chrome-mcp-debug','--profile-directory=Profile','--no-first-run','--no-default-browser-check','about:blank'` → re-probe (~1s).
3. **Fresh profile → login:** navigate to the platform; on auth wall, apply the login gate below (cookies then persist on disk).
- Keep the window open (closing drops `:9222`); re-bootstrap each session. A plain `chrome.exe` launch without the dedicated `--user-data-dir` hands off to normal Chrome and never binds the port.

**Login gate (all platforms, every task).** If a step needs a logged-in session and the page shows an auth wall / login redirect → **stop and ask the user to log in manually** in the CareerOps Chrome window, then resume on confirmation. Never enter credentials or work around the wall. If the locked source is non-essential, skip it and note `source-locked`; if it's required for the task, halt until logged in.
