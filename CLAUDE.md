> **Sync note:** This is the Claude Code version of the shared project guidelines. Any changes to project context, tech stack, file structure, dev workflow, permissions, or command boundaries must be reflected in `AGENTS.md` and `GEMINI.md`. When adding or modifying skills, update `.claude/skills/` for Claude Code and `.agents/skills/` for Codex/Gemini.

# Agentic Guidelines: Svelte & Hono Monorepo

## 1. Project Context & Architecture

- **Monorepo Strategy:** High-isolation architecture.
    - `apps/`: Deployable applications (`web-public`, `web-backoffice`, `api-public`, `api-backoffice`).
    - `packages/`: Shared libraries (`types`, `validator`, `database`, `ui`).
- **Runtime Environment:**
    - **API Runtime:** Nitro v3 owns API runtime wiring, builds, generated Cloudflare deploy config, storage access, and WebSocket/Pub/Sub runtime semantics.
    - **Production Preset:** Cloudflare Workers (Edge), built by Nitro and deployed with the Nitro-generated Wrangler config.
    - **HTTP Router:** Hono remains the API HTTP router/provider; keep HTTP routes in the existing Hono route tree rather than moving them into Nitro filesystem routes. WebSocket upgrade routes are the exception: Nitro owns them directly.
    - **Development/Scripting:** Node.js (>=24.16.0), Bun (>=1.3.14).
    - **Constraint:** All shared code must be runtime-agnostic (no Node-specific APIs like `fs` inside Cloudflare-targeted packages).
    - **API Runtime Boundary:** Hono route and middleware code must depend on app-owned runtime services (`kvClient`, `objectStorageSigner`, DB config/request metadata) instead of direct Workers globals or bindings. Cloudflare KV and Hyperdrive enter through Nitro runtime wiring; WebSocket/Pub/Sub uses Nitro's `cloudflare_durable` preset and generated `$DurableObject`.

## 2. Tech Stack & Standards

- **Frontend:** Svelte (SvelteKit), SPA mode (`adapter-static`). CSP via `kit.csp` in `svelte.config.js` (hash mode, build-time).
- **Backend:** Hono. BFF pattern — separate instances for `public` (client-facing) and `admin` (dashboard) APIs. Use Hono RPC or shared Zod validators for contract safety.
- **Database:** Drizzle ORM. Schema in `packages/database/src/postgres/schema.ts`. Direct DB calls only in backend apps.
- **Language:** TypeScript (Strict mode).
- **Types (`packages/types`):**
    - `@PROJECT_NAME/types/shared` — shared API response types (`TApiResponse<T>`, `TApiResponseOk<T>`, `TApiResponseError`).
    - `@PROJECT_NAME/types/public` — public-app specific types.
    - Type definitions only — no runtime code beyond type references.

## 3. File Structure & Naming

- **Directories:**
    - `src/routes`: SvelteKit routes.
    - `packages/ui/src/components/`: shadcn-svelte UI primitives (managed by the `shadcn-svelte` CLI).
    - `apps/*/src/lib/components/`: Custom/project-specific reusable components.
    - `apps/api-{public,backoffice}/src/core/nitro/ws.ts`: Nitro-owned WebSocket channel registry. Add new WebSocket channels to `wsChannelHandlers`; do not mount WebSocket upgrade routes in Hono.
- **Styling:** Tailwind CSS v4 with `@tailwindcss/vite` and `tw-animate-css`.
- **Files:**
    - Follow the relevant project skill for framework-specific naming and organization conventions.
    - For Svelte/SvelteKit component naming, route organization, imports, and UI patterns, load `svelte-patterns`.

## 4. Development Workflow

- **Package Management:** pnpm (>=11.1.2) is the primary package manager. Use the root lockfile (`pnpm-lock.yaml`). Do not create nested lockfiles.
- **Template Merges:** When merging this global template into downstream forks, follow `MERGING.md` before applying domain-specific skills.
- **Running Apps:** Use `pnpm --filter=<package-name>` to target individual workspaces:
    ```bash
    pnpm --filter=@PROJECT_NAME/api-public dev     # Nitro dev on :8081
    pnpm --filter=@PROJECT_NAME/api-public build:bun  # Nitro Bun runtime output
    pnpm --filter=@PROJECT_NAME/api-public build:bun:staging  # Nitro Bun runtime output with nitro-staging.config.ts
    pnpm --filter=@PROJECT_NAME/api-public build:bun:prod  # Nitro Bun runtime output with nitro-production.config.ts
    pnpm --filter=@PROJECT_NAME/api-public build:node  # Nitro Node runtime output
    pnpm --filter=@PROJECT_NAME/api-public build:node:staging  # Nitro Node runtime output with nitro-staging.config.ts
    pnpm --filter=@PROJECT_NAME/api-public build:node:prod  # Nitro Node runtime output with nitro-production.config.ts
    pnpm --filter=@PROJECT_NAME/api-public preview  # Build and preview the Cloudflare Nitro output with Wrangler
    pnpm --filter=@PROJECT_NAME/api-public preview:node  # Build and run the Node Nitro output on :8081
    pnpm --filter=@PROJECT_NAME/api-public preview:bun  # Build and run the Bun Nitro output on :8081
    pnpm --filter=@PROJECT_NAME/api-public build:cloudflare  # Nitro Cloudflare durable output
    pnpm --filter=@PROJECT_NAME/api-public build:cloudflare:staging  # Nitro Cloudflare durable output with nitro-staging.config.ts
    pnpm --filter=@PROJECT_NAME/api-public build:cloudflare:prod  # Nitro Cloudflare durable output with nitro-production.config.ts
    pnpm --filter=@PROJECT_NAME/web-public dev     # SvelteKit on :5174 (vite dev)
    pnpm --filter=@PROJECT_NAME/database migrate:dev  # Run DB migrations (dev)
    ```
- **Environment Variables:**
    - `apps/api-{public,backoffice}/nitro.config.ts` -- canonical shared API runtime/deploy config. `runtimeConfig` is the app variable schema and is overridden with `NITRO_*` variables; base `cloudflare.wrangler` defines local/default Cloudflare bindings/deploy config for generated `.output/server/wrangler.json`.
    - `apps/api-{public,backoffice}/nitro-env.config.example.ts` -- committed template for mergeable environment deploy overrides.
    - `apps/api-{public,backoffice}/nitro-{environment}.config.ts` -- local-only environment deploy overrides loaded through `NITRO_DEPLOY_ENV` (for example `nitro-staging.config.ts` and `nitro-production.config.ts`). Copy from `nitro-env.config.example.ts`; these files are ignored by Git and must not be committed. The template exports a typed `{ shared, runtimes: { cloudflare, node, bun } }` shape; `NITRO_RUNTIME_PRESET` selects the runtime overlay and package scripts set it automatically.
    - `apps/api-{public,backoffice}/.dev.vars` — app-local default development secrets and documented Nitro runtime config examples (not committed). Copy from `.dev.vars.example`; use `.dev.vars.<env>` for environment-specific runtime variables such as `.dev.vars.staging` or `.dev.vars.production`. Prefer `NITRO_SERVICE_*`, `NITRO_DATABASE_*`, and `NITRO_OBJECT_STORAGE_*` for app runtime config. Object storage uses S3-compatible R2 requests signed with `aws4fetch`; do not add direct R2 bucket bindings.
    - `packages/database/.env` / `.env.test` — Postgres connection strings for local dev and test migrations.
- **Nitro Runtime:** API apps are Nitro-owned. Use `preview` to build and run the default Cloudflare/Wrangler output with the app-local `.dev.vars`. Use `preview:node` / `preview:bun` to build and run the Node or Bun Nitro output with the same app-local `.dev.vars`; append `:staging` or `:prod` to build commands when you need ignored Nitro env configs. Runtime-specific Nitro env config lives under `runtimes.cloudflare`, `runtimes.node`, and `runtimes.bun`; shared environment defaults live under `shared`. Use `build:cloudflare` to generate local/default `.output/server/wrangler.json`, `build:cloudflare:staging` / `build:cloudflare:prod` to generate env-specific Wrangler output from ignored Nitro env configs, and `deploy:staging` / `deploy:prod` for real Cloudflare deploys using the generated config. WebSocket channels are registered through Nitro config at `/api/ws/**` and implemented in `src/core/nitro/ws.ts`; Hono does not mount WebSocket upgrade routes.
- **Test Boundaries:**
    - API tests use plain Vitest on Node and local runtime fixtures.
    - Nitro runtime compatibility is verified through Nitro build/preview commands.
    - API suites share the `hyperion_test` bootstrap target; run public and backoffice suites one app at a time to avoid database creation races.

## 5. Available Skills

Use the Skill tool to load the relevant skill before starting any task in these areas:

| Skill                         | When to use                                                                     |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `svelte-patterns`             | Working on frontend Svelte/SvelteKit code or UI components                      |
| `hono-patterns`               | Implementing or modifying Hono API routes, middleware, or error handling        |
| `database-validator-patterns` | Modifying DB schema, writing Drizzle queries, or adding/updating Zod validators |
| `auth-implementation`         | Implementing auth logic or fixing auth bugs                                     |
| `vitest-patterns`             | Debugging, writing, or hardening API Vitest tests                               |
| `monorepo-troubleshooting`    | Fixing build errors, setting up new packages, or understanding the build graph  |

## 6. Permissions & Command Boundaries

> **Note for agents and developers:** For Claude Code, these rules are **hard-enforced** by `.claude/settings.json` at the tool level — this section is a human-readable mirror of those settings. For Codex and Gemini, this section is the **project-level guidance** for safe operation. If you tighten or change `.claude/settings.json`, update this section in all root agent docs to match.

To ensure project safety, strictly adhere to the following file access and command execution boundaries (mirrored from `.claude/settings.json`):

- **Allowed Scope:** Focus your file reads and edits within `apps/` and `packages/`, as well as root configuration files (`*.json`, `*.yaml`, `*.toml`, `*.js`, `*.ts`, `*.md`).
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
> - CI/CD workflows for `build:cloudflare` followed by Wrangler deploy against `.output/server/wrangler.json`.
> - Secret management for `NITRO_*` runtime variables and `wrangler secret bulk .dev.vars.<env>`.
> - Database migration promotion (`migrate:staging`, `migrate:prod`).
> - CI/CD pipeline conventions (`.gitlab-ci.yaml`, `.github/` workflows).
