> **Sync note:** This is the Gemini version of the shared project guidelines. Any changes to project context, tech stack, file structure, dev workflow, permissions, or command boundaries must be reflected in `AGENTS.md` and `CLAUDE.md`. When adding or modifying skills, update `.agents/skills/` for Gemini/Codex and `.claude/skills/` for Claude Code.

# Agentic Guidelines: Svelte & Hono Monorepo

## 1. Project Context & Architecture

- **Monorepo Strategy:** High-isolation architecture.
    - `apps/`: Deployable applications (`web-public`, `web-backoffice`, `api-public`, `api-backoffice`).
    - `packages/`: Shared libraries (`types`, `validator`, `database`, `ui`).
- **Runtime Environment:**
    - **Production:** Cloudflare Workers (Edge).
    - **Development/Scripting:** Node.js (>=24.15.0).
    - **Constraint:** All shared code must be runtime-agnostic (no Node-specific APIs like `fs` inside Cloudflare-targeted packages).

## 2. Tech Stack & Standards

- **Frontend:** Svelte (SvelteKit), SPA mode (`adapter-static`). CSP via `kit.csp` in `svelte.config.js` (hash mode, build-time).
- **Backend:** Hono BFFs for public and backoffice clients. Mount all HTTP endpoints below `/api`, including heartbeat and v1. Use Hono RPC or shared Zod validators for contract safety.
- **Database:** Drizzle ORM. Schema in `packages/database/src/postgres/schema.ts`. Direct DB calls only in backend apps.
- **Language:** TypeScript (Strict mode).
- **Types (`packages/types`):**
    - `@PROJECT_NAME/types/shared` — shared API response types (`TApiResponse<T>`, `TApiResponseOk<T>`, `TApiResponseError`).
    - `@PROJECT_NAME/types/public` — public-app specific types.
    - Type definitions only — no runtime code beyond type references.

## 3. File Structure & Naming

- **Directories:**
    - `src/routes`: SvelteKit routes.
    - `apps/api-*/src/core/route/api/`: Hono route modules mounted below `/api`.
    - `packages/ui/src/components/`: shadcn-svelte UI primitives (managed by the `shadcn-svelte` CLI).
    - `apps/*/src/lib/components/`: Custom/project-specific reusable components.
- **Styling:** Tailwind CSS v4 with `@tailwindcss/vite` and `tw-animate-css`.
- **Files:**
    - Follow the relevant project skill for framework-specific naming and organization conventions.
    - For Svelte/SvelteKit component naming, route organization, imports, and UI patterns, load `svelte-patterns`.

## 4. Development Workflow

- **Package Management:** pnpm (>=11.1.2) is the primary package manager. Use the root lockfile (`pnpm-lock.yaml`). Do not create nested lockfiles.
- **Template Merges:** When merging this global template into downstream forks, follow `MERGING.md` before applying domain-specific skills.
- **Running Apps:** Use `pnpm --filter=<package-name>` to target individual workspaces:
    ```bash
    pnpm --filter=@PROJECT_NAME/api-public dev     # Hono on :8081 (wrangler dev)
    pnpm --filter=@PROJECT_NAME/web-public dev     # SvelteKit on :5174 (vite dev)
    pnpm --filter=@PROJECT_NAME/database migrate:dev  # Run DB migrations (dev)
    ```
- **Environment Variables:**
    - `apps/api-{public,backoffice}/wrangler.toml` — non-secret vars and Cloudflare bindings. BFF deployments default to `zone_name` subdirectory routes; commented `custom_domain` routes are the alternative. Object storage uses `aws4fetch`-signed S3-compatible R2 requests, not direct R2 bindings.
    - `apps/api-public/.dev.vars` — secrets (not committed). Copy from `.dev.vars.example` which documents all required keys (`BETTER_AUTH_SECRET`, `CF_TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, R2 S3 API keys, OAuth keys).
    - `packages/database/.env` / `.env.test` — Postgres connection strings for local dev and test migrations.

## 5. Project Skills

Project skills live in `.agents/skills/`. Each skill covers a focused domain with detailed coding rules, patterns, or checklists. Load the relevant skill before starting any task in these areas:

- `svelte-patterns` — Working on frontend Svelte/SvelteKit code or UI components
- `hono-patterns` — Implementing or modifying Hono API routes, middleware, or error handling
- `database-validator-patterns` — Modifying DB schema, writing Drizzle queries, or adding/updating Zod validators
- `auth-implementation` — Implementing auth logic or fixing auth bugs
- `cloudflare-worker-testing` — Debugging or writing vitest tests targeting Cloudflare Workers
- `monorepo-troubleshooting` — Fixing build errors, setting up new packages, or understanding the build graph

## 6. Permissions & Command Boundaries

> **Note for agents and developers:** For Claude Code, these rules are **hard-enforced** by `.claude/settings.json` at the tool level — this section is a human-readable mirror of those settings. For Gemini and Codex, this section is the **project-level guidance** for safe operation. If you tighten or change `.claude/settings.json`, update this section in all root agent docs to match.

To ensure project safety, strictly adhere to the following file access and command execution boundaries (mirrored from `.claude/settings.json`):

- **Allowed Scope:** `apps/`, `packages/`, both skill directories, and root configuration files (`*.json`, `*.yaml`, `*.toml`, `*.js`, `*.ts`, `*.md`).
- **Forbidden Files:** NEVER edit or write to ANY files inside the `.git/` directory.
- **Allowed Commands:** You may safely execute generic package manager commands (`pnpm *`) and read-only Git commands (`git status`, `git log`, `git diff`, `git branch`, `git show`, `git stash list`).
- **Forbidden Commands:** NEVER auto-run or propose the following destructive commands:
    - `git reset --hard *`
    - `git push --force` or `git push -f`
    - `git clean *`
    - `rm -rf *` or `rimraf *`

---

> **TODO — Future Iterations:** Add a **Deployment & CI/CD** section covering:
>
> - `wrangler deploy` workflows for staging/production (scripts already exist per app).
> - Environment-specific wrangler configs (`wrangler-staging.toml`, `wrangler-production.toml`).
> - Secret management (`wrangler secret bulk .dev.vars.<env>`).
> - Database migration promotion (`migrate:staging`, `migrate:prod`).
> - CI/CD pipeline conventions (`.gitlab-ci.yaml`, `.github/` workflows).
