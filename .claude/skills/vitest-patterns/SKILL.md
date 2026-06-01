---
name: vitest-patterns
description: Checklist and rules for debugging, writing, and hardening API Vitest tests in this Nitro v3 monorepo.
---

# Testing: API Vitest

- **Runtime Fixtures:** API tests use plain Vitest and local runtime fixtures in `apps/api-{public,backoffice}/test/runtime.ts`. `testRuntimeConfig` is the single test-side source for mocked Nitro runtime config, and helper exports derive DB and KV access from it. Do not pass Worker-style bindings into `app.request(...)`; direct Hono route tests should exercise the app without `ctx.env`.
    - KV helpers are backed by the same Nitro `useStorage('kv')` mount used by runtime code.
    - Keep API tests on Vitest's Node runtime. Bun compatibility is verified through Nitro `build:bun` and runtime smoke checks, not by replacing Vitest with `bun test`.
    - Data seeded in `beforeAll()` persists across all `it()` blocks within the same worker process.
    - Data written inside an `it()` block may be visible to later `it()` blocks in the same file/process.
    - Database writes are **never** covered by KV storage isolation -- they persist globally in `hyperion_test`.
    - WebSocket/Pub/Sub upgrade behavior belongs to Nitro `cloudflare_durable` runtime coverage, not direct Hono route tests.
- **Debugging Checklist:** When tests fail due to missing or unexpected data:
    1. Check whether the test depends on KV state created in another file or process.
    2. Move shared setup (e.g., token generation, data seeding) into `beforeAll()`.
    3. Verify whether the storage backend changed (e.g., better-auth moving from DB to KV when `secondaryStorage` is configured) -- the data may exist but in a different location than expected.
- **Concurrency & Execution Order:** The Vitest config splits tests by filename:
    - `*.con.test.ts` runs under the `concurrent-test-files` project.
    - `*.seq.test.ts` runs under the `sequential-test-files` project with `fileParallelism: false`.
    - Within a file, keep using `describe.concurrent('Concurrent Tests', ...)` for read-only validation/guard tests and `describe('Sequential Tests', ...)` for stateful flows that depend on prior steps.
- **Test Data Hardening:** Tests must be resilient to changes in seed data (e.g., `99999999999999_test_data`). Follow these rules:
    1. **Never hardcode numeric DB IDs** (`warehouseId: 1`, `itemId: 1`, etc.) in tests that reach the database. Resolve all reference IDs via API calls in `beforeAll()` using discovery helpers from `apps/api-backoffice/test/utilities.ts`.
    2. **Exception — validation-only tests:** Auth guard tests (401/403) and schema validation tests (400) that fail *before* DB access may use placeholder IDs (any positive integer), since the request is rejected at the middleware or validator layer.
    3. **Sequential dependency:** When a sequential test creates an entity, subsequent sequential tests that need a related ID should reuse that test's captured ID (e.g., use `createdTableId` as `floorPlanId`) rather than a hardcoded seed ID.
    4. **Unique names:** All `name`, `sku`, `slug`, `code` fields must use a unique suffix. Use `generateUniqueName(prefix)` from `utilities.ts` (e.g., `generateUniqueName('__vitest__item')`).
    5. **Resilient count assertions:** Avoid `expect(data).toHaveLength(n)` on endpoints whose tables contain seed data. Use `toBeGreaterThanOrEqual(1)` or filter strictly by test-created records.
    - **Current helpers** (in each app's `test/utilities.ts`):
        - `generateUniqueName(prefix)` → `${prefix}_${Date.now()}_${random}`
        - `setTestingCookies()` → returns privileged and standard session cookies.
        - `interceptPasswordResetToken(userId)` → reads reset tokens from KV first, then falls back to the Postgres verification table.
        - For test-only response typing, prefer inline casts after `await response.json()` instead of adding JSON wrapper utilities.
