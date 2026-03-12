# Agentic Guidelines: Svelte & Hono Monorepo

> **First-time setup:** Read and store the contents of this file in your memory system so future conversations have full project context.

## 1. Project Context & Architecture

- **Monorepo Strategy:** High-isolation architecture.
    - `apps/`: Deployable applications (`web-public`, `web-admin`, `api-public`, `api-admin`).
    - `packages/`: Shared libraries (`types`, `validator`, `database`, `ui`).
- **Runtime Environment:**
    - **Production:** Cloudflare Workers (Edge).
    - **Development/Scripting:** Node.js (>=24.14.0).
    - **Constraint:** All shared code must be runtime-agnostic (no Node-specific APIs like `fs` inside Cloudflare-targeted packages).

## 2. Tech Stack & Standards

- **Frontend:** Svelte (SvelteKit).
    - **Mode:** SPA (Single Page Application) using `adapter-static`.
    - **Security:** CSP is configured via SvelteKit's built-in `kit.csp` option in `svelte.config.js` (hash mode, build-time).
- **Backend:** Hono.
    - **Pattern:** BFF (Backend for Frontend). Separate Hono instances for `public` (client-facing) and `admin` (dashboard) APIs.
    - **Typing:** Use Hono's RPC features or shared Zod validators for strict contract safety.
- **Database:** Drizzle ORM.
    - **Location:** Schema definitions live in `packages/database/src/postgres/schema.ts`.
    - **Access:** Direct DB calls are permitted _only_ in the Backend (Hono) apps, never in the Frontend.
- **Language:** TypeScript (Strict mode).

## 3. Coding Rules & Patterns

### A. Svelte/SvelteKit

1.  **Reactivity:** Prefer Svelte 5 runes (`$state`, `$derived`, `$effect`) over legacy store syntax where possible.
2.  **Data Fetching:**
    - Do not use `+page.server.ts` for data loading if the app is purely SPA/static.
    - Fetch data client-side using a typed API client wrapper around the Hono backend.
3.  **Components:** Keep business logic outside of `.svelte` files; move complex logic to `.ts` utility files.

### B. Hono (Backend)

1.  **Middleware:** Use middleware to normalize environment variables across runtimes (Cloudflare `env` vs. Node/Bun `process.env`).
2.  **Context:** Always type the Hono `Context` with the specific environment bindings (e.g., D1 Database, R2 Bucket, KV Namespace).
3.  **Error Handling:** Use the standardized response wrappers in `api-public/src/utilities.ts`. Do not throw raw exceptions — throw `AppError` (from `src/errors.ts`) instead, which the global `.onError` handler catches.
    - **Success:** `apiResponseOkWrapper(ctx, { data, count?, limit?, offset? })` → `{ success: true, data, ... }`
    - **Error:** `apiResponseErrorWrapper(ctx, { code, message, validatorIssues?, status? })` → `{ success: false, error: { requestId, code, message, validatorIssues? } }`
    - **Types:** `TApiResponse<T>`, `TApiResponseOk<T>`, `TApiResponseError` from `@hyperion/types/shared`.
    - **Zod:** `outputSchema(dataSchema)` from `@hyperion/validator/shared` for RPC type safety. The schema includes the `success` discriminant and `requestId` in error responses, matching the types exactly.
4.  **Validation:** Use `validatorCallback` from `utilities.ts` which runs `safeParseAsync` and returns `code: "DATA_VALIDATION"` with Zod issues on failure.

### C. Drizzle & Database

1.  **Schema Changes:** Strictly modify schema in `packages/database/src/postgres/schema.ts`.
2.  **Queries:**
    - Use the query builder syntax (`db.query.users.findMany(...)`) for readability.
    - Avoid raw SQL (`sql` template tag) unless absolutely necessary for performance.

### D. Types (`packages/types`)

- **Import:** `@hyperion/types/shared` — shared API response types (`TApiResponse<T>`, `TApiResponseOk<T>`, `TApiResponseError`).
- **Import:** `@hyperion/types/public` — public-app specific types.
- Contains TypeScript type definitions only (no runtime code beyond type references).

### E. Validators (`packages/validator`)

- **Depends on:** `@hyperion/types` (tsconfig project reference + workspace dependency).

1.  **Shared Validators (`@hyperion/validator/shared`):**
    - `field.ts` — Low-level Zod field builders (`vBoolean`, `vInt`, `vNumeric`, `vText`) accepting `{ fieldName, message, min, max }`.
    - `base.ts` — Composed schemas: `addressInputSchema`, `readManyInputSchema` (limit/offset/sort), `outputSchema<Data>`.
    - `refinement.ts` — Custom `.check()` callbacks: `dateString()`, `password()` (uppercase + lowercase + numeric + symbol), `updatedFields()`.
2.  **Public Validators (`@hyperion/validator/public/*`):** Domain-specific schemas organized by feature (`auth`, `user`, `admin/user`, `objectStorage`).
3.  **Adding a New Validator:**
    - Create `*.schema.ts` in the appropriate `public/` subdirectory using shared field builders and refinements.
    - Re-export from the nearest `index.ts`.
    - Add a named export entry to `packages/validator/package.json` exports map.
    - Rebuild: `pnpm --filter=@hyperion/validator build`.

### F. UI Component Library (`packages/ui`)

- **Built with:** `@sveltejs/package` (`svelte-package`).
- **Components:** shadcn-svelte (backed by bits-ui) — 57 components installed.
- **Config:** `components.json` at `packages/ui/` root defines aliases and paths.
- **Utility:** `@hyperion/ui/utils` exports the `cn()` helper (`clsx` + `tailwind-merge`).
- **Styling:** Theme CSS (zinc, oklch) in `src/styles/globals.css`. Import via `@hyperion/ui/styles`.
- **Icons:** `@lucide/svelte`.
- **Note:** `tsconfig.json` intentionally does not extend `tsconfig.base.json` — it uses `bundler` module resolution required by Svelte tooling, which conflicts with the root config's `nodenext` resolution.

### G. Authentication (better-auth)

1.  **Ownership:** Auth is owned by `apps/api-public` (`src/auth/index.ts`). Initialized per-request via `initContext` middleware — not a global singleton.
2.  **Strategies:** Email + Password (custom scrypt via `@noble/hashes`), Email OTP (via Resend), Username plugin. Google OAuth is reserved in env but not yet wired.
3.  **Organization & ACL:** `organization` plugin with custom roles/permissions built by `aclBuilder` (`src/auth/acl.ts`), loaded from DB/KV.
4.  **Session Storage:** Primary in Postgres, secondary in Cloudflare KV (`HYPERION_KV`) via `secondaryStorage`. KV minimum TTL workaround: any TTL < 60s is clamped to 60s.
5.  **Middleware Chain:** `isAuthenticated` → reads session/user/role into Hono context vars (`ctx.get('session')`, `ctx.get('user')`, `ctx.get('role')`, `ctx.get('isPrivilegedRole')`). `isAuthorized(permissions)` → checks `auth.api.hasPermission`.
6.  **Cookies:** Prefix `sentinel`, `httpOnly`, `partitioned`, `sameSite: "strict"`, `secure: true`, domain from `env.COOKIE_DOMAIN`.

## 4. File Structure & Naming

- **Directories:**
    - `src/routes`: SvelteKit routes.
    - `packages/ui/src/components/`: shadcn-svelte UI primitives (managed by the `shadcn-svelte` CLI).
    - `apps/*/src/lib/components/default`: Custom/project-specific reusable components.
- **Styling:** Tailwind CSS v4 with `@tailwindcss/vite`, daisyUI v5, and `tw-animate-css`.
- **Files:**
    - Use `kebab-case` for filenames (e.g., `user-profile.svelte`).
    - Exception: shadcn-svelte components follow their own naming conventions as generated by the CLI.
    - Use `PascalCase` for component names in imports (e.g., `import UserProfile from...`).

## 5. Development Workflow

- **Package Management:** pnpm is the primary package manager. Use the root lockfile (`pnpm-lock.yaml`). Do not create nested lockfiles.
- **Running Apps:** Use `pnpm --filter=<package-name>` to target individual workspaces:
    ```bash
    pnpm --filter=@hyperion/api-public dev     # Hono on :8080 (wrangler dev)
    pnpm --filter=@hyperion/web-public dev     # SvelteKit on :5173 (vite dev)
    pnpm --filter=@hyperion/database migrate:dev  # Run DB migrations (dev)
    ```
- **Build Order / Dependency Graph:**

    ```
    Level 0 (parallel, no inter-dependencies):
      @hyperion/types       (no workspace deps)
      @hyperion/database    (no workspace deps)
      @hyperion/ui          (no workspace deps)

    Level 1 (depends on Level 0):
      @hyperion/validator   (depends on types)

    Level 2 (depends on Level 0 + 1):
      @hyperion/api-public  (depends on types + validator + database)

    Level 3 (depends on Level 0–2):
      @hyperion/web-public  (depends on api-public + types + validator + ui)
    ```

    pnpm resolves this order automatically from `workspace:*` declarations. Packages auto-build on `pnpm install` via `"prepare": "pnpm build"`. No Turborepo/Nx pipeline needed.

- **Dependency Strategy for `api-public`:** This is a private package bundled by wrangler — the `dependencies` vs `devDependencies` split has no effect on its own build. `dependencies` lists only what consumers (e.g., `web-public`) need for type resolution of the exported Hono routes. Server-only packages live in `devDependencies` to avoid leaking them transitively into frontend apps. See the `README` key in its `package.json`.
- **Environment Variables:**
    - `apps/api-public/wrangler.toml` — non-secret `[vars]` (CORS, cookie, URLs, etc.) and CF bindings (`HYPERION_KV`, `HYPERION_HD`, `HYPERION_R2`, `HYPERION_DO_WSS`).
    - `apps/api-public/.dev.vars` — secrets (not committed). Copy from `.dev.vars.example` which documents all required keys (`BETTER_AUTH_SECRET`, `CF_TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, R2 keys, OAuth keys).
    - `packages/database/.env` / `.env.test` — Postgres connection strings for local dev and test migrations.

## 6. AI Model Selection

Use the appropriate model based on task complexity and scope. Each tier lists the Claude and Gemini equivalents.

> **Note:** Always use the latest available version of each model (e.g., Claude Opus 4.6 over 4, Gemini 3.1 Pro over 3.0 Pro).

### Tier 1: Deep Reasoning & Architecture — Claude Opus / Gemini Pro

- Planning and designing system architecture (new features, data models, API contracts).
- Evaluating trade-offs between approaches (e.g., auth strategies, caching layers).
- Debugging complex, cross-cutting issues that span multiple packages or services.
- Writing or reviewing security-sensitive code (auth flows, CSP policies, input validation).
- Drafting or revising technical documentation and agentic guidelines.

### Tier 2: Multi-File Implementation & Refactoring — Claude Sonnet / Gemini Pro

- Implementing features that touch multiple files or packages (e.g., new API endpoint + contract + frontend integration).
- Refactoring across the monorepo (renaming exports, restructuring modules, migrating patterns).
- Writing and updating test suites alongside implementation changes.
- Code reviews and PR-level analysis requiring full context of the changeset.
- Integrating third-party libraries or services (e.g., adding a new shadcn component with backend wiring).

### Tier 3: Targeted & Repetitive Tasks — Claude Haiku / Gemini Flash

- Single-file edits: fixing typos, updating imports, adding/removing a dependency.
- Generating boilerplate (new route stubs, Zod schemas from existing types, Drizzle migration scaffolds).
- Running and interpreting CLI commands (build, lint, test).
- Quick lookups: finding file paths, grepping for usages, reading configs.
- Formatting, linting fixes, and other mechanical code transformations.

## 7. Testing: Cloudflare Workers (vitest-pool-workers)

- **Isolated Storage:** `@cloudflare/vitest-pool-workers` enables `isolatedStorage` by default. This means **all writes to KV, R2, D1, Durable Objects, and Caches within an `it()` block are rolled back** when that test ends.
    - Data seeded in `beforeAll()` persists across all `it()` blocks within its `describe()` scope (suite-level storage frame).
    - Data written inside an `it()` block is **not visible** in subsequent `it()` blocks.
- **Debugging Checklist:** When tests fail due to missing data that was written in a prior step:
    1. Check if the write happened inside an `it()` block and the read happens in a different `it()` block — this will fail due to `isolatedStorage`.
    2. Move shared setup (e.g., token generation, data seeding) into the `beforeAll()` of the enclosing `describe()` so it lives at the suite-level storage frame.
    3. Verify whether the storage backend changed (e.g., better-auth moving from DB to KV when `secondaryStorage` is configured) — the data may exist but in a different location than expected.

---

> **TODO — Future Iterations:** Add a **Deployment & CI/CD** section covering:
>
> - `wrangler deploy` workflows for staging/production (scripts already exist per app).
> - Environment-specific wrangler configs (`wrangler-staging.toml`, `wrangler-production.toml`).
> - Secret management (`wrangler secret bulk .dev.vars.<env>`).
> - Database migration promotion (`migrate:staging`, `migrate:prod`).
> - CI/CD pipeline conventions (`.gitlab-ci.yaml`, `.github/` workflows).
