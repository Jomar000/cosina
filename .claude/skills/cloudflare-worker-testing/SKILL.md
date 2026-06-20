---
name: cloudflare-worker-testing
description: Project rules for writing and debugging Vitest tests that run against Cloudflare Workers, including storage and database isolation, concurrency, authentication fixtures, and resilient test data.
---

# Cloudflare Worker Testing

## Storage

- Manage `@cloudflare/vitest-pool-workers` through the root `pnpm-workspace.yaml` catalog and reference it with `catalog:`; read the catalog for the current version.
- Cloudflare-bound local storage is isolated per test file, not per `it()` block. KV, Durable Object, Cache, and other local Worker writes persist between tests in one file and reset between files.
- Setup in `beforeAll()` remains available to every test in that file. Writes from one test are visible to later tests in the same file.
- Each API Vitest command gets a randomly suffixed Postgres database. Node-side setup derives it from `packages/database/.env.test`; the Worker never loads the env file and receives only the generated URL through Hyperdrive. Files and projects within that command share the database, separate commands are isolated, and Vitest teardown force-drops it after passing or failing runs. Do not use `beforeExit` for cleanup because it may run while Worker tests are still active; forced termination can leave an orphaned database.
- R2 uses `aws4fetch`-signed S3-compatible HTTP requests, not a direct binding; local pool isolation does not cover it unless the test stubs or intercepts the request.

When data is missing or unexpected:

1. Check whether it was created in another test file.
2. Move file-shared setup, such as token generation or seeding, to `beforeAll()`.
3. For Postgres state, check whether another file in the same Vitest command created or changed it; separate commands do not share the generated database.
4. Check whether the storage backend changed, such as better-auth moving data from Postgres to KV through `secondaryStorage`.

## Execution

- Name independent files `*.con.test.ts`; they run in the `concurrent-test-files` project.
- Name ordered or stateful files `*.seq.test.ts`; they run in `sequential-test-files` with `fileParallelism: false`.
- Run tests through the API package scripts. The aggregate `test` script runs `test:con` and `test:seq` in parallel through pnpm's exact script selector with `--no-bail`, so one failure does not terminate the other child and the aggregate still fails after both finish. Each child remains a separate Vitest command with its own generated database. Their plain-text CLI output overwrites the ignored `test-con.out` and `test-seq.out` files in the API app, suppressing logs from passing tests while retaining failure logs and summaries. Do not prepend them with `migrate:test` or add a test `localConnectionString` to Wrangler.
- Run `test:ui:con` or `test:ui:seq` directly; the aggregate `test:ui` script only reminds developers to select one so Vitest retains terminal input and `q` can trigger normal database teardown. Reserve strict API/UI ports `51204`/`51205` for public concurrent/sequential and `51206`/`51207` for backoffice concurrent/sequential; keep `--api.strictPort` and open the UI at `http://localhost:<port>/__vitest__/`.
- Keep `deps.optimizer.ssr` inside each Vitest project with its distinct `cacheDir`; a root optimizer makes concurrent and sequential commands race while atomically replacing the shared dependency cache.
- When changing the bootstrap or database lifecycle implementation rather than test behavior, also load `database-validator-patterns`.
- Use `describe.concurrent(...)` only for suites whose tests may overlap. Use plain `describe(...)` for sequential suites.
- In mixed files, keep the outer grouping suite plain and mark only concurrent child suites. Override inherited concurrency with `describe(name, { concurrent: false }, callback)` when a sequential suite must sit under a concurrent suite.
- Never use deprecated `describe.sequential(...)`.

## Requests and Authentication

- Set the `Origin` header from `env.URL_FRONTEND`, including WebSocket origin-guard tests.
- Use shared `setTestingCookies()` fixtures instead of repeating seeded sign-in requests. Destructure only the roles the file needs.
- Choose actors by domain relationship as well as permission. For example, use the seeded operator assigned to the location or tenant resource resolved by the production workflow.
- To share another seeded role, add its cookie to the helper, append it to the returned tuple to preserve existing destructuring, and document the role and tuple order.
- Leave seeded sign-in success assertions to authentication endpoint tests; unrelated endpoint setup should not assert them.

## Resilient Data

1. Never hardcode numeric database IDs in tests that reach Postgres. Resolve reference IDs through API discovery helpers in `apps/api-backoffice/test/utilities.ts` during `beforeAll()`.
2. Auth guard (`401`/`403`) and schema validation (`400`) tests may use positive placeholder IDs only when rejection occurs before database access.
3. In sequential flows, capture and reuse IDs created by earlier tests instead of relying on seed IDs.
4. Generate unique `name`, `sku`, `slug`, and `code` values with `generateUniqueName(prefix)`.
5. Do not assert exact collection lengths when seed rows may exist. Filter to test-created records or use a lower-bound assertion.

Fixture ownership:

- Put reusable, generic reference rows in the test migration. This includes shared identities, memberships, organizations, uploads, and other records used across multiple suites.
- Create scenario-specific or mutable lifecycle state in the owning file's `beforeAll()`. This includes balances, approval flags, pending transactions, open deals, and records that the suite consumes or transitions.
- Make `beforeAll()` setup idempotent and restore the suite's expected clean slate when rerun without rebuilding the database.
- Clean up in foreign-key dependency order and target only records owned by that scenario.
- Never rely on test-file execution order or another suite's Postgres mutations.

Current helpers in each app's `test/utilities.ts`:

- `buildQueryPath(path, query)` encodes scalar and repeated query parameters.
- `generateUniqueName(prefix)` returns `${prefix}_${Date.now()}_${random}`.
- `getTestingRequest()` and `postTestingRequest()` send requests with the configured frontend origin and optional authentication data.
- `interceptPasswordResetToken(userId)` reads KV first, then the Postgres verification table.
- `setTestingCookies()` returns shared seeded-role cookies in its documented tuple order.
- `unpackError(responseData)` extracts the first validation issue or falls back to the API error message.
