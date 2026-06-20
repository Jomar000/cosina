---
name: database-validator-patterns
description: Project rules for Drizzle schemas and queries, PostgreSQL constraints and tenancy, local/test database bootstrap and migrations, create idempotency, and Zod validators. Use when changing database structures, writing queries, modifying bootstrap or migration behavior, configuring test database lifecycles, or adding and modifying validators.
---

# Database and Validators

## Drizzle

- Change database structure only in `packages/database/src/postgres/schema.ts`.
- After changing the schema, generate the matching Drizzle migration and snapshot artifacts and commit them with the schema change. Do not hand-edit an existing applied migration.
- In Hono handlers, use the initialized request context: `ctx.get('dbClient')` for typed `select`, `insert`, `update`, `delete`, and transactions; `ctx.get('dbSchema')` for table references.
- Use `db.query.*` only where already configured and materially clearer.
- Avoid raw `sql` except for schema defaults/checks, atomic expressions, or queries the typed builder cannot express cleanly.

## Local and Test Bootstrap

- Use `packages/database/.env` and `.env.test` only as Node-side bootstrap/migration inputs; Worker runtime code must never load either file. Vitest reads `.env.test` in Node configuration to derive an ephemeral database URL, and the Worker receives only that generated URL through Hyperdrive.
- Keep `packages/database/src/postgres/bootstrap.ts` and `utilities.ts` Node-only, excluded from the Worker-facing database build and package exports. Put orchestration in `bootstrap.ts` and reusable recreate/drop operations in `utilities.ts`.
- Keep direct `migrate:dev`, `migrate:test`, and test cleanup execution behind the `import.meta.main` path in `bootstrap.ts`; staging and production continue to use Drizzle Kit.

For each API Vitest command:

1. Call `prepareTestDatabaseEnvironment()` with the app's Hyperdrive binding before creating the Cloudflare test plugin. It derives a UUIDv7-suffixed URL from `.env.test` and sets `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_<BINDING>`.
2. Register `bootstrap.ts` as `globalSetup`; its default `manageTestDatabaseLifecycle()` export owns provisioning and teardown.
3. Preserve the process-scoped lifecycle guard because Vitest may initialize the inherited global setup more than once.
4. Recreate the generated database, apply default and test migrations, and force-drop it after setup failure or Vitest teardown. Do not use `beforeExit` for cleanup because it may run while Worker tests are still active; forced termination can leave an orphaned database.
5. Before provisioning, best-effort cleanup drops only exact UUIDv7 test database names older than 24 hours. Use `cleanup:test` for manual stale cleanup.

Do not duplicate the test URL in Wrangler `localConnectionString` or prepend API test scripts with `migrate:test`.

## Ownership and Tenancy

Before adding a table or ownership column, classify its records:

- **Global:** Keep shared identity, auth, and system tables global unless a product requirement makes them tenant-specific. Examples: `user`, `account`, `verification`, `two_factor`, `role`, `permission`, `key_counter`, and `key_value`.
- **Identity-owned:** Model ownership according to the identity relationship; do not add `organization_id` by default.
- **User-owned:** Key by `user_id` when data is intentionally shared across the user's organizations. If values may differ by organization, model them as organization-owned, usually with `(organization_id, user_id)`.
- **Organization-owned:** Add `organization_id`, scope common reads and writes to the active organization, and use tenant-aware uniqueness and indexes, such as `(organization_id, slug)` or `(organization_id, created_at)`, when they match real access patterns.

For tenant-scoped user actors:

- Pair `created_by`, `updated_by`, `approved_by`, and `deleted_by` with `organization_id`.
- Use composite foreign keys to `member(organization_id, user_id)`.
- Apply this `_by` rule only to user references, not display text such as `posted_by`, `filed_by`, or `requested_by` unless intentionally modeled as actors.
- Add matching composite indexes only when required by common tenant queries or foreign-key maintenance.

## Constraints and Indexes

- Give any predicted Drizzle/Postgres name over 63 characters an explicit name: `table_name_<INDEX_TYPE>_<random_6_alphanumeric>`, where the type is `idx`, `unique`, `fk`, `pk`, or `check`, and the suffix contains six random lowercase `a-z`/`0-9` characters.
- Do not index a primary-key column separately.
- Do not duplicate coverage already provided by a primary key, unique constraint, or index.
- Check left-prefix coverage before adding an index; `(organization_id, user_id)` already covers filters by `organization_id`.

## Create Idempotency

When a create endpoint needs retry safety:

- Add a nullable, unique `idempotency_key uuid` column to the primary created table in `packages/database/src/postgres/schema.ts`.
- Require the key through API validation while leaving the database column nullable for legacy and manual rows.
- Do not add idempotency columns to status-transition endpoints protected by atomic update conditions.

## Zod Validators

`PROJECT_NAME` is the reusable template token for the repository package scope; it resolves to `hyperion` in this repository.

`@PROJECT_NAME/validator` depends on `@PROJECT_NAME/types` through a workspace dependency and TypeScript project reference.

Shared exports under `@PROJECT_NAME/validator/shared`:

- `field.ts`: `vBoolean(fieldName)` accepts a field-name string; `vInt`, `vNumeric`, and `vText` accept `{ fieldName, message, min, max }` option objects.
- `base.ts`: `addressInputSchema`, `readManyInputSchema` (`limit`, `offset`, and `sortOrder`), `outputSchema<Data>`, and `paginatedOutputSchema<Data>` with required `count`, `limit`, and `offset`. Existing output schema helpers are contract/schema artifacts and are not a mandate to parse or validate API responses at runtime.
- `refinement.ts`: `.check()` callbacks `dateString()`, `password()` (uppercase, lowercase, numeric, and symbol), `uniqueArrayValues()`, and `updatedFields()`.

Domain schemas mirror app surfaces:

- `@PROJECT_NAME/validator/public/*` maps to `packages/validator/src/public`.
- `@PROJECT_NAME/validator/backoffice/*` maps to `packages/validator/src/backoffice`.
- Existing groups include `auth`, `user`, `admin/user`, and `objectStorage`.

To add a validator:

1. Create `*.schema.ts` in the appropriate public or backoffice directory.
2. Compose shared field builders, base schemas, and refinements where they fit; use raw `z.*` only for unsupported behavior.
3. Alphabetize all named schema exports within your `.schema.ts` files.
4. Re-export it from the nearest `index.ts`, keeping the re-exports alphabetized as well.
5. Add a `packages/validator/package.json` export only when introducing a new public package subpath; named schemas within an existing subpath do not need separate export-map entries.
6. Run `pnpm --filter=@PROJECT_NAME/validator build`.
