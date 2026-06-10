---
name: cloudflare-worker-testing
description: Project rules for writing and debugging Vitest tests that run against Cloudflare Workers, including storage isolation, concurrency, authentication fixtures, and resilient test data.
---

# Cloudflare Worker Testing

## Storage

- `@cloudflare/vitest-pool-workers` is managed in the root `pnpm-workspace.yaml` catalog (currently `^0.16.5`).
- Cloudflare-bound local storage is isolated per test file, not per `it()` block. KV, Durable Object, Cache, and other local Worker writes persist between tests in one file and reset between files.
- Setup in `beforeAll()` remains available to every test in that file. Writes from one test are visible to later tests in the same file.
- Postgres writes through Hyperdrive are never isolated and persist globally.
- R2 uses `aws4fetch`-signed S3-compatible HTTP requests, not a direct binding; local pool isolation does not cover it unless the test stubs or intercepts the request.

When data is missing or unexpected:

1. Check whether it was created in another test file.
2. Move file-shared setup, such as token generation or seeding, to `beforeAll()`.
3. Check whether the storage backend changed, such as better-auth moving data from Postgres to KV through `secondaryStorage`.

## Execution

- Name independent files `*.con.test.ts`; they run in the `concurrent-test-files` project.
- Name ordered or stateful files `*.seq.test.ts`; they run in `sequential-test-files` with `fileParallelism: false`.
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

Current helpers in each app's `test/utilities.ts`:

- `generateUniqueName(prefix)` returns `${prefix}_${Date.now()}_${random}`.
- `setTestingCookies()` returns shared seeded-role cookies in its documented tuple order.
- `interceptPasswordResetToken(userId)` reads KV first, then the Postgres verification table.
