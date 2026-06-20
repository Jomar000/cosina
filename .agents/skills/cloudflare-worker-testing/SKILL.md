---
name: cloudflare-worker-testing
description: Project rules for writing and debugging Vitest tests that run against Cloudflare Workers, including storage and database isolation, concurrency, authentication fixtures, and resilient test data.
---

# Cloudflare Worker Testing

## Storage and Database Isolation

- Cloudflare storage is isolated per test file, not per `it()` block. KV, Durable Object, and Cache writes remain available to later tests in the same file, but not to other files.
- Put file-wide storage setup in `beforeAll()`.
- Each API Vitest command creates its own UUIDv7-suffixed Postgres database. Files within that command share the database.
- The concurrent and sequential commands use different databases because they are separate Vitest commands.
- Vitest receives the generated database URL through the app's Hyperdrive binding. Do not add a test `localConnectionString` to Wrangler.
- The global setup owns database creation, migrations, stale-database cleanup, and teardown. Do not use `beforeExit` for cleanup.
- R2 requests use signed S3-compatible HTTP calls. Worker storage isolation does not isolate R2 unless the test stubs or intercepts those requests.
- Manage `@cloudflare/vitest-pool-workers` through the root catalog in `pnpm-workspace.yaml`.

When data is missing:

1. Check whether another test file created it. Test files do not share Cloudflare storage.
2. Move required storage setup into the current file's `beforeAll()`.
3. Check whether another file in the same Vitest command changed shared Postgres data.
4. Check whether the production storage path changed, such as Better Auth moving a record to KV.

## Test Organization

- Name independent test files `*.con.test.ts`. They run in the `concurrent-test-files` project.
- Name ordered or stateful test files `*.seq.test.ts`. They run in the `sequential-test-files` project with `fileParallelism: false`.
- Use `describe.concurrent(...)` only when the enclosed tests may overlap safely.
- Use plain `describe(...)` for sequential suites. Never use deprecated `describe.sequential(...)`.
- In a mixed file, keep the outer suite plain. Mark only independent child suites as concurrent.
- Use `describe(name, { concurrent: false }, callback)` when a sequential child must be placed inside a concurrent parent.
- A large domain may use thin `.con.test.ts` and `.seq.test.ts` entrypoints backed by one `*.shared.ts` module. Export separate registration functions, and make sure each entrypoint registers only its own suites.
- Keep setup and mutable state local to the test file through hooks. Never depend on test-file execution order.

## Running Tests

- Run tests through the API package scripts.
- The aggregate `test` script runs `test:con` and `test:seq` in parallel. Each child keeps its own database, and the aggregate command reports a failure if either child fails.
- Keep `--silent=passed-only` so successful logs stay quiet while failures remain visible.
- Do not redirect test output or prepend test commands with `migrate:test`.
- Run `test:ui:con` or `test:ui:seq` directly. The aggregate `test:ui` script is only a reminder.
- Keep strict UI ports `51204` and `51205` for public concurrent and sequential tests. Use `51206` and `51207` for backoffice.
- Keep dependency optimization inside each Vitest project with a separate `cacheDir`. A shared optimizer cache causes races between concurrent commands.
- Also load `database-validator-patterns` when changing test database bootstrap or lifecycle code.

## Authentication Fixtures

- Set the `Origin` header from `env.URL_FRONTEND`, including WebSocket tests.
- Use `seedTestingCookies()` for setup authentication outside auth endpoint tests. Call it once in a file-level `beforeAll()`.
- `seedTestingCookies()` returns `[ownerCookie, memberCookie, administratorCookie]`. Destructure only the roles the file uses.
- Do not share returned cookies across test files. Each file has isolated KV.
- Better Auth stores these test sessions only in KV while `secondaryStorage` is enabled and `storeSessionInDatabase` is unset. Do not insert matching session rows into Postgres.
- Store the unsigned token as the KV key. Store `{ session, user }` under that key and the token metadata under `active-sessions-{userId}`.
- Send an HMAC-signed and URI-encoded `token.signature` value in the request cookie. Do not use the unsigned KV token as the cookie value.
- Use `signInTestingUser()` when an auth test needs a real sign-in. Request only the role the test uses.
- Keep sign-in success assertions in authentication tests. Unrelated endpoint setup should not test sign-in again.
- When adding a seeded role, append its cookie to the tuple so existing tuple positions do not change. Document the new order.

## Direct Database Access

- In a sequential test file, open at most one direct Postgres client in the outer `beforeAll()`.
- Reuse that client for setup, assertions, and cleanup.
- Close the client in the outer `afterAll()`.
- Do not open and close a new client for each query.

## Resilient Test Data

- Do not hardcode numeric database IDs when a request reaches Postgres. Resolve reference IDs through shared discovery helpers during `beforeAll()`.
- Positive placeholder IDs are allowed for `400`, `401`, or `403` tests only when rejection happens before database access.
- In sequential flows, capture IDs created by earlier tests and reuse those values.
- Generate unique names, SKUs, slugs, and codes with `generateUniqueName(prefix)`.
- Do not assert exact collection sizes when seed rows may exist. Filter for test-owned rows or assert a lower bound.
- Put reusable identities, memberships, organizations, uploads, and other shared reference rows in the test migration.
- Create mutable scenario data in the file that owns the scenario.
- Make `beforeAll()` setup safe to rerun and restore the expected starting state.
- Clean up only records owned by the scenario, in foreign-key dependency order.

## Errors, Timeouts, and Configuration

- Keep global `hookTimeout` and `testTimeout` values at 15 seconds.
- Add a local timeout only when the tested operation is expected to take longer.
- Filter known infrastructure errors with Vitest's `onUnhandledError`.
- Never install blanket `uncaughtException` or `unhandledRejection` listeners.
- Match a filtered error by type, exact message, and dependency stack. All other unhandled errors must remain test failures.
- Type named Vitest callbacks with `TestUserConfig` from `vitest/config`.
- The app `check` script does not include `vitest.config.ts`. Type-check the config separately when it changes.

## Completion Checklist

- Run the affected API package's `check`, `lint`, and aggregate `test` scripts.
- When `vitest.config.ts` changes, type-check it directly and run at least one Vitest project.
- Confirm that split or moved tests are still registered.
- Confirm that concurrent suites are independent.
- Confirm that sequential suites own and clean up their mutable state.
- Keep `.agents/skills/cloudflare-worker-testing/SKILL.md` and `.claude/skills/cloudflare-worker-testing/SKILL.md` identical.

## Shared Test Helpers

- `buildQueryPath(path, query)` encodes scalar and repeated query parameters.
- `generateUniqueName(prefix)` returns a timestamped and randomized name.
- `getTestingRequest()` and `postTestingRequest()` send requests with the configured frontend origin and optional authentication.
- `interceptPasswordResetToken(userId)` reads KV first, then the Postgres verification table.
- `seedTestingCookies()` creates owner, member, and administrator KV sessions and returns their cookies in that order.
- `signInTestingUser()` performs a real sign-in for one seeded role.
- `unpackError(responseData)` returns the first validation issue or the API error message.
