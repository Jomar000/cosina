# Agentic Guidelines: Svelte & Hono Monorepo

## 1. Project Context & Architecture

* **Monorepo Strategy:** High-isolation architecture.
    * `apps/`: Deployable applications (e.g., `web-public`, `web-admin`, `api-public`, `api-admin`).
    * `packages/`: Shared libraries (e.g., `db` for Drizzle schema, `validator` for Zod schemas).
* **Runtime Environment:**
    * **Production:** Cloudflare Workers (Edge).
    * **Development/Scripting:** Bun or Node.js.
    * **Constraint:** All shared code must be runtime-agnostic (no Node-specific APIs like `fs` inside Cloudflare-targeted packages).

## 2. Tech Stack & Standards

* **Frontend:** Svelte (SvelteKit).
    * **Mode:** SPA (Single Page Application) using `adapter-static`.
    * **Security:** CSP headers are injected via post-build scripts, not runtime hooks.
* **Backend:** Hono.
    * **Pattern:** BFF (Backend for Frontend). Separate Hono instances for `public` (client-facing) and `admin` (dashboard) APIs.
    * **Typing:** Use Hono's RPC features or shared Zod validators for strict contract safety.
* **Database:** Drizzle ORM.
    * **Location:** Schema definitions live in `packages/db`.
    * **Access:** Direct DB calls are permitted *only* in the Backend (Hono) apps, never in the Frontend.
* **Language:** TypeScript (Strict mode).

## 3. Coding Rules & Patterns

### A. Svelte/SvelteKit
1.  **Reactivity:** Prefer Svelte 5 runes (`$state`, `$derived`, `$effect`) over legacy store syntax where possible.
2.  **Data Fetching:**
    * Do not use `+page.server.ts` for data loading if the app is purely SPA/static.
    * Fetch data client-side using a typed API client wrapper around the Hono backend.
3.  **Components:** Keep business logic outside of `.svelte` files; move complex logic to `.ts` utility files.

### B. Hono (Backend)
1.  **Middleware:** Use middleware to normalize environment variables across runtimes (Cloudflare `env` vs. Node/Bun `process.env`).
2.  **Context:** Always type the Hono `Context` with the specific environment bindings (e.g., D1 Database, R2 Bucket, KV Namespace).
3.  **Error Handling:** Return structured JSON errors (e.g., `{ success: false, error: "code", message: "..." }`). Do not throw raw exceptions.

### C. Drizzle & Database
1.  **Schema Changes:** Strictly modify schema in `packages/db/schema.ts`.
2.  **Queries:**
    * Use the query builder syntax (`db.query.users.findMany(...)`) for readability.
    * Avoid raw SQL (`sql` template tag) unless absolutely necessary for performance.

## 4. File Structure & Naming

* **Directories:**
    * `src/routes`: SvelteKit routes.
    * `src/lib/components`: Reusable UI components.
    * `src/lib/server`: Server-only logic (if applicable).
* **Files:**
    * Use `kebab-case` for filenames (e.g., `user-profile.svelte`).
    * Use `PascalCase` for component names in imports (e.g., `import UserProfile from...`).

## 5. Development Workflow

* **Package Management:** Use the root lockfile (bun/pnpm). Do not create nested lockfiles.
