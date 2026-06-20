# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI TestHub is an AI-driven software testing requirements management tool. It is a single **Next.js 14 App Router** web app in `app/`, backed by **PostgreSQL**, with NextAuth authentication, role-based multi-tenancy, a REST API, webhooks, import/export, audit logs, comments, test plans, attachments, notifications, and global search. Multi-provider AI via the Vercel AI SDK. User-facing content is predominantly **Chinese**.

> **History:** The project originally shipped a second **Electron desktop edition** that shared the same Prisma schema and React UI. That edition was **removed** (see git history) — its main process, preload, Vite build, and renderer shell were deleted. What survives from it and is still load-bearing:
> - **`src/renderer/`** — the React **pages and per-domain hooks** (`useRequirements`, `useTestCases`, …). The Next.js dashboard pages (`app/(dashboard)/*/page.tsx`) re-export these unmodified. They call `window.electronAPI.*`, which `lib/electron-api-polyfill.ts` shims onto `lib/api-client.ts` (HTTP). So **API-route JSON shapes must still match the old `electronAPI` contract** (typed in `types/electron-api.d.ts`).
> - **`src/main/`** — now holds only the three AI files reused by the API routes: `ai-service.ts`, `agent-orchestrator.ts`, `agent-tools.ts` (Node builtins only, no Electron). The `src/main` name is historical; it is no longer an Electron main process.

## Development Commands

### Team Edition (Next.js + Postgres)

```bash
docker compose up -d        # Start PostgreSQL (pgvector/pgvector:pg16) on :5432
npm run prisma:migrate      # Apply migrations to the Postgres DB
npm run prisma:generate     # Generate Prisma client (default node_modules location)
npm run next:dev            # Next.js dev server on port 3000
npm run next:build          # Production build (output: 'standalone' for containers)
npm run next:start          # Serve the production build on port 3000
```

Copy `.env.example` → `.env` and set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` before running.

### Shared

```bash
npm run prisma:generate  # Generate Prisma client (default location, + linux-musl engine for Docker)
npm run prisma:migrate   # Run migrations in dev (prisma migrate dev)
npm run prisma:deploy    # Apply migrations in prod (prisma migrate deploy)
npm run prisma:studio    # Open Prisma Studio GUI
npm run prisma:seed      # Seed database (tsx prisma/seed.ts)
npm run lint             # eslint . --ext ts,tsx --max-warnings 0
npm run lint:fix         # ESLint auto-fix
```

There are no tests and no test runner configured. `npm run dev` and `npm run next:dev` are the same Next dev server (port 3000). See `DEPLOY.md` for Docker/production deployment.

## Architecture

### Shared Foundation

**`prisma/schema.prisma`** — the **PostgreSQL** schema (`provider = "postgresql"`). Generator has `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` so the Docker (Alpine) image gets a Linux query engine. Models, grouped:
- **Auth / multi-tenancy**: `User`, `Account`, `Session`, `VerificationToken`, `ProjectMembership`, plus the `Role` enum (`ADMIN`, `PM`, `QA`, `DEV`, `VIEWER`)
- **Core**: `Project`, `Requirement` (hierarchical via `parentId`), `TestPlan`, `TestCase`, `TestExecution`, `TestScript`, `Defect`, `ProjectSettings`, `GeneratedContent`. `Requirement` ↔ `TestPlan` is many-to-many via `TestPlanRequirement`.
- **Agent workflow**: `AgentConfig`, `AgentWorkflow`, `AgentTask`, `AgentMessage`, `AgentExecutionLog`
- **Analysis**: `DiagnosticReport`, `TestPoint`, `SelfHealingRecord`, `RootCauseReport`
- **Team**: `AuditLog`, `Comment`, `TestExecutionRound`, `Notification` (in-app, per-user), `Attachment` (polymorphic, local-disk metadata)

**`src/shared/types.ts`** — all TypeScript interfaces, enums, and type aliases shared across main, renderer, and the Next.js layer. The canonical type reference.

**`src/renderer/`** — the React pages and per-domain hooks (`useRequirements`, `useTestCases`, `useDefects`, …) that call `window.electronAPI.*`. The Next.js dashboard pages re-export these (see the polyfill below).

### Team Edition (Next.js)

**App Router** (`app/`):
- `app/(dashboard)/*/page.tsx` — the authenticated pages (projects, requirements, test-cases, defects, scripts, reports, settings, agent, traceability, execution-rounds, integrations, import). Most are thin wrappers around the reused `src/renderer` pages.
- `app/api/**/route.ts` — the REST API (see pattern below).
- `app/login`, `app/register` — auth pages; `middleware.ts` redirects unauthenticated users to `/login` (re-exports `next-auth/middleware` with a path matcher).

**`lib/` helpers** (repo root, imported as `@/../lib/...`):
- `prisma.ts` — Prisma client singleton
- `auth.ts` — NextAuth v4 config: Credentials provider (email + password, bcryptjs against `User.passwordHash`), **JWT** session, `PrismaAdapter`, sign-in page `/login`
- `auth-helpers.ts` — server-side guards: `requireAuth()` and `requireProjectRole(projectId, allowedRoles[])` → returns `{ session, membership }` or `null`
- `api-client.ts` — browser fetch wrapper exposing the `electronAPI`-shaped surface
- `electron-api-polyfill.ts` — **the bridge**: `(window as any).electronAPI = apiClient`. Imported at the top of `app/(dashboard)/layout.tsx` so the reused `src/renderer` hooks/components run unmodified in the browser. Consequently, **API-route response shapes must match the old `electronAPI` contract**.
- `audit.ts` — audit-log helper

**API route pattern** (e.g. `app/api/projects/[projectId]/test-cases/route.ts`):
```ts
const auth = await requireProjectRole(params.projectId, ['ADMIN', 'PM', 'QA']);
if (!auth) return NextResponse.json({ message: '无权…' }, { status: 403 });
// ... prisma query ...
return NextResponse.json(result);
```
Every project-scoped route enforces RBAC this way. Note the import-alias quirk: `@/` resolves to `src/`, so the root-level `lib/` is reached via `@/../lib/...` while renderer code is `@/renderer/...`.

**Team-only features** (no Electron equivalent): webhooks (`app/api/webhooks/github`, `app/api/webhooks/junit`), import (`app/api/projects/[projectId]/import`, uses `xlsx` + `fast-xml-parser`), `traceability-matrix`, `execution-rounds`, `audit-logs`, `comments`, `test-plans` (CRUD + many-to-many requirement linking), `attachments` (local-disk upload to `public/uploads/<projectId>/`, polymorphic `targetType/targetId`; served as static files), `notifications` (in-app, emitted via `lib/notify.ts` on defect assign/status-change; polled by `components/NotificationBell.tsx`), and global `search` (cross-entity, `components/GlobalSearch.tsx`). Register new dashboard pages in the nav at `components/DashboardSidebar.tsx`.

**Reusable cross-edition UI:** `src/renderer/components/AttachmentPanel.tsx` (mounts in Requirement/TestCase/Defect detail modals; calls `window.electronAPI.{getAttachments,uploadAttachment,deleteAttachment}`). Automation coverage is real: `TestScript.testCaseId` links scripts to cases, and `dashboard-stats` computes `automationRate` = distinct linked cases / total cases (wired via the script workspace's "关联用例" selector).

### AI / Agent code (`src/main/`)

Three files survive from the old desktop edition, imported directly by the API routes (Node builtins only, no Electron):
- `ai-service.ts` — `aiService` singleton. Uses the Vercel AI SDK's `generateText`. Imported by `app/api/ai/generate` and `app/api/projects/[projectId]/agent/task`.
- `agent-orchestrator.ts` — `AgentOrchestrator`, the 4-stage agent pipeline (see below). Imported by `app/api/projects/[projectId]/agent/run-workflow`.
- `agent-tools.ts` — `AgentTools` wrapping Prisma CRUD, sandbox execution (spawns `python`/`node` child processes in temp dirs), git log/diff, and AI utilities. `keytar` and the vector DB are passed in as constructor params (typed `any`); the API routes inject a `makeKeytar()` env-key shim and `lib/agent-retriever`'s token-overlap retriever instead.

The Next.js `app/(dashboard)/layout.tsx` provides the `ProjectProvider` + `SettingsProvider` context the reused `src/renderer` pages expect. Monaco Editor powers the ScriptWorkspace. An enhanced variant `TestCasesPageEnhanced` is the one actually rendered (standard `TestCasesPage` re-exports it).

### AI Provider Support

Six providers via the Vercel AI SDK, configured through `ProjectSettings.aiProvider`:
- `OPENAI`, `ANTHROPIC`, `GOOGLE` — their respective `@ai-sdk/*` packages
- `DEEPSEEK`, `KIMI`, `QWEN` — all routed through `createOpenAI` with a custom `baseURL`

**Key resolution:** API routes use the per-project key in `project_settings.apiKey` first, falling back to server-side env keys (`OPENAI_API_KEY`, …) via `lib/ai-keys.resolveApiKey`. Model, maxTokens, temperature, and custom system prompts also live in `project_settings`.

### Agent Workflow Pipeline

`agent-orchestrator.ts` runs a sequential 4-agent pipeline (invoked from the `run-workflow` API route):
1. **QA Architect** — searches the vector DB for similar historical requirements, calls the LLM for ambiguity/conflict/edge-case detection, parses the JSON response, saves a `DiagnosticReport`
2. **Test Designer** — generates `TestPoint` and `TestCase` records from the QA analysis + AC list
3. **Test Developer** — generates Python pytest scripts per test case, executes them in the sandbox, and runs a ReAct loop (up to 3 retries) feeding failures back to the LLM for auto-fix
4. **Test Maintainer** — only runs if the Developer stage failed; does root-cause analysis on failed scripts

Progress is pushed to the renderer via `mainWindow.webContents.send('agent-progress', ...)`.

## Key Patterns

- **Renderer talks to `window.electronAPI`** — `lib/electron-api-polyfill.ts` mounts `api-client` onto `window.electronAPI` so the reused `src/renderer` hooks/pages run unmodified in the browser. Keep API-route JSON shapes aligned with the `electronAPI` contract typed in `types/electron-api.d.ts`.
- **Chinese-first** — prompts, mock responses, and UI are predominantly Chinese; AI system prompts instruct the model to respond in Chinese.
- **Mock fallback** — `ai-service.ts` catches errors and falls back to `getMockResponse()` with hardcoded Chinese markdown. A separate stub `AIService` exists inline in `index.ts`, largely superseded by the real one imported dynamically.
- **Dynamic imports for AI deps** — AI SDK packages are dynamically imported (`await import('ai')`) in many places to avoid requiring them at module load time.
- **Agent retrieval is token-overlap, not vectors** — the QA stage finds similar requirements via `lib/agent-retriever.ts` (Jaccard token overlap), injected into `AgentOrchestrator`. The old hand-rolled hash "vector" service was deleted with the desktop edition; Docker's `pgvector` image is reserved "for future real vector retrieval".
- **No strict TypeScript** — `tsconfig.json` has `strict: false`; much of the code uses `any`. `next.config.js` sets `eslint.ignoreDuringBuilds: true` so lingering lint warnings don't block the build.
- **`@/` path alias** resolves to `src/` in all Vite configs and tsconfig. Root-level `lib/` (Team Edition) is reached via `@/../lib/...`.
- **Tailwind CSS** with `class`-based dark mode (see `useTheme`); **Monaco Editor** in the ScriptWorkspace with inline AI panels.
