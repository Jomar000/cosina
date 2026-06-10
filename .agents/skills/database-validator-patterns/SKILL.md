---
name: database-validator-patterns
description: Project rules for Drizzle schemas and queries, PostgreSQL constraints and tenancy, create idempotency, and Zod validators. Use when changing database structures, writing queries, or adding and modifying validators.
---

# Database and Validators

## Drizzle

- Change database structure only in `packages/database/src/postgres/schema.ts`.
- In Hono handlers, use the initialized request context: `ctx.get('dbClient')` for typed `select`, `insert`, `update`, `delete`, and transactions; `ctx.get('dbSchema')` for table references.
- Use `db.query.*` only where already configured and materially clearer.
- Avoid raw `sql` except for schema defaults/checks, atomic expressions, or queries the typed builder cannot express cleanly.

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

`@PROJECT_NAME/validator` depends on `@PROJECT_NAME/types` through a workspace dependency and TypeScript project reference.

Shared exports under `@PROJECT_NAME/validator/shared`:

- `field.ts`: `vBoolean`, `vInt`, `vNumeric`, and `vText`, accepting `{ fieldName, message, min, max }`.
- `base.ts`: `addressInputSchema`, `readManyInputSchema` (`limit`, `offset`, and `sort`), `outputSchema<Data>`, and `paginatedOutputSchema<Data>` with required `count`, `limit`, and `offset`.
- `refinement.ts`: `.check()` callbacks `dateString()`, `password()` (uppercase, lowercase, numeric, and symbol), and `updatedFields()`.

Domain schemas mirror app surfaces:

- `@PROJECT_NAME/validator/public/*` maps to `packages/validator/src/public`.
- `@PROJECT_NAME/validator/backoffice/*` maps to `packages/validator/src/backoffice`.
- Existing groups include `auth`, `user`, `admin/user`, and `objectStorage`.

To add a validator:

1. Create `*.schema.ts` in the appropriate public or backoffice directory.
2. Compose shared field builders, base schemas, and refinements where they fit; use raw `z.*` only for unsupported behavior.
3. Re-export it from the nearest `index.ts`.
4. Add its named export to the `packages/validator/package.json` exports map.
5. Run `pnpm --filter=@PROJECT_NAME/validator build`.
