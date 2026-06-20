> **Sync note:** This is the Codex version of the shared project guidelines. Any changes to project context, tech stack, file structure, dev workflow, permissions, or command boundaries must be reflected in `CLAUDE.md` and `GEMINI.md`. When adding or modifying skills, update `.agents/skills/` for Codex/Gemini and `.claude/skills/` for Claude Code.

# Agentic Guidelines: Svelte & Hono Monorepo

## 1. Project Context & Architecture

- **Monorepo Strategy:** High-isolation architecture.
    - `apps/`: Deployable applications (`web-public`, `web-backoffice`, `api-public`, `api-backoffice`).
    - `packages/`: Shared libraries (`types`, `validator`, `database`, `ui`).
- **Runtime Environment:**
    - **Production:** Cloudflare Workers (Edge).
    - **Development/Scripting:** Node.js (>=24.16.0).
    - **Constraint:** Code imported into Cloudflare Worker bundles must be runtime-agnostic and must not use Node-specific APIs such as `fs` or `process.env`. Node-only development and test modules, such as the database bootstrap and utilities, may use Node APIs while excluded from the Worker-facing build and package exports.

### Template Tokens

- Agent guidance and skills remain reusable by downstream template forks.
- `PROJECT_NAME` is a documentation token for the package scope and uppercase binding prefix. In this repository, package examples resolve to `@hyperion/*`, while app-specific bindings include `HYPERIONPUB_KV` and `HYPERIONBOFC_KV`.
- Commands copied into a concrete repository must replace `@PROJECT_NAME` with that repository's actual package scope.

## 2. Tech Stack & Standards

- **Frontend:** Svelte (SvelteKit), SPA mode (`adapter-static`). CSP via `kit.csp` in `svelte.config.js` (hash mode, build-time).
- **Backend:** Hono BFFs for public and backoffice clients. Mount all HTTP endpoints below `/api`, including heartbeat and v1. Use Hono RPC or shared Zod validators for contract safety.
- **Database:** Drizzle ORM. Schema in `packages/database/src/postgres/schema.ts`. Direct DB calls only in backend apps.
- **Language:** TypeScript (Strict mode).
- **Types (`packages/types`):**
    - `@PROJECT_NAME/types/shared` -- shared API response types (`TApiResponse<T>`, `TApiResponseOk<T>`, `TApiResponsePaginated<T>`, `TApiResponsePaginatedOk<T>`, `TApiResponseError`).
    - `@PROJECT_NAME/types/public` -- public-app specific types.
    - `@PROJECT_NAME/types/backoffice` -- backoffice-app specific types.
    - Type definitions only -- no runtime code beyond type references.

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

- **Package Management:** pnpm (>=11.8.0) is the primary package manager. Use the root lockfile (`pnpm-lock.yaml`). Do not create nested lockfiles.
- **Template Merges:** When merging this global template into downstream forks, follow `MERGING.md` before applying domain-specific skills.
- **Running Apps:** Use `pnpm --filter=<package-name>` to target individual workspaces:
    ```bash
    pnpm --filter=@PROJECT_NAME/api-public dev     # Hono on :8081 (wrangler dev)
    pnpm --filter=@PROJECT_NAME/web-public dev     # SvelteKit on :5174 (vite dev)
    pnpm --filter=@PROJECT_NAME/database migrate:dev  # Run DB migrations (dev)
    pnpm --filter=@PROJECT_NAME/database cleanup:test # Drop test databases older than 24 hours
    pnpm --filter=@PROJECT_NAME/api-public test    # Concurrent/sequential projects run in parallel on isolated databases
    ```
- **Environment Variables:**
    - `apps/api-{public,backoffice}/wrangler.toml` -- non-secret vars and Cloudflare bindings. BFF deployments default to `zone_name` subdirectory routes; commented `custom_domain` routes are the alternative. Object storage uses `aws4fetch`-signed S3-compatible R2 requests, not direct R2 bindings.
    - `apps/api-{public,backoffice}/.dev.vars` -- secrets (not committed). Copy the matching `.dev.vars.example`, which documents all required keys (`BETTER_AUTH_SECRET`, `CF_TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, R2 S3 API keys, OAuth keys).
    - `packages/database/.env` / `.env.test` -- Node-only inputs for development/test bootstrap and migrations, never Worker runtime configuration. Vitest derives a UUIDv7-suffixed URL from `.env.test`, injects that generated URL into local Hyperdrive, drops the database during teardown, and removes matching orphaned databases after 24 hours on later test starts. Use `cleanup:test` for manual stale cleanup; development runtime uses Wrangler's `localConnectionString`.

## 5. Deployment & CI/CD

- App scripts provide `deploy:staging` and `deploy:prod` using `wrangler-staging.toml` and `wrangler-production.toml`.
- API scripts provide `secret:staging` and `secret:prod` for `wrangler secret bulk`.
- Database scripts provide `migrate:staging` and `migrate:prod`.
- Deployment, secret-management, and staging/production migration commands require explicit human approval and must never be auto-run.
- No repository-wide CI pipeline convention is established yet. Preserve existing `.github/` or `.gitlab-ci.yaml` behavior when one is introduced or modified.

## 6. Project Skills

Project skills live in `.agents/skills/` for Codex/Gemini and `.claude/skills/` for Claude Code. Load the relevant skill before starting any task in these areas; Claude Code should use the Skill tool.

- `svelte-patterns` -- Working on frontend Svelte/SvelteKit code or UI components
- `hono-patterns` -- Implementing or modifying Hono API routes, middleware, or error handling
- `database-validator-patterns` -- Modifying DB schema, Drizzle queries, database bootstrap/migrations, test database lifecycles, or Zod validators
- `auth-implementation` -- Implementing auth logic or fixing auth bugs
- `cloudflare-worker-testing` -- Debugging or writing vitest tests targeting Cloudflare Workers
- `monorepo-troubleshooting` -- Fixing build errors, setting up new packages, or understanding the build graph

## 7. Permissions & Command Boundaries

> **Note for agents and developers:** For Claude Code, these rules are **hard-enforced** by `.claude/settings.json` at the tool level -- this section is a human-readable mirror of those settings. For Codex and Gemini, this section is the **project-level guidance** for safe operation. If you tighten or change `.claude/settings.json`, update this section in all root agent docs to match.

To ensure project safety, strictly adhere to the following file access and command execution boundaries (mirrored from `.claude/settings.json`):

- **Allowed Scope:** `apps/`, `packages/`, both skill directories, and root configuration files (`*.json`, `*.yaml`, `*.toml`, `*.js`, `*.ts`, `*.md`).
- **Forbidden Files:** NEVER edit or write to ANY files inside the `.git/` directory.
- **Allowed Commands:** You may execute pnpm install, build, check, lint, test, format, and dev workflows, plus development/test database migrations. Read-only Git access is limited to `git status`, `git log`, `git diff`, `git show`, `git stash list`, `git branch --show-current`, and `git branch --list`.
- **Approval-Required Commands:** Mutating Git commands, deployments, secret changes, and staging/production migrations require explicit human approval. Do not infer approval from a general implementation request.
- **Forbidden Commands:** NEVER auto-run or propose the following destructive commands:
    - `git reset --hard *`
    - `git push --force` or `git push -f`
    - `git clean *`
    - `rm -rf *` or `rimraf *`
