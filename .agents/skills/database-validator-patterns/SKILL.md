---
name: database-validator-patterns
description: Rules for Drizzle ORM schema changes and queries, and for adding or modifying Zod validators. Use this when modifying the database schema, writing Drizzle queries, or adding/updating Zod validators.
---

# Drizzle & Database

1.  **Schema Changes:** Strictly modify schema in `packages/database/src/postgres/schema.ts`.
2.  **Queries:**
    - Follow the existing typed Drizzle builder style in the API apps: `ctx.get('dbClient').select(...).from(...).where(...)`, `insert`, `update`, `delete`, and `.transaction(...)`.
    - Use `ctx.get('dbSchema')` inside Hono request handlers so table references come from the initialized request context.
    - Use the relational `db.query.*` API only where it is already configured and materially improves readability.
    - Avoid raw SQL (`sql` template tag) except for schema defaults/checks, atomic expressions, or cases where the typed builder cannot express the query cleanly.
3.  **Constraints & Indexes:**
    - Before adding a table or ownership column, classify the record as `global`, `identity-owned`, `user-owned`, or `organization-owned`; only organization-owned domain records should default to `organization_id`.
    - Keep shared identity/auth/system tables global unless a concrete product requirement makes them tenant-specific. Current examples include `user`, `account`, `verification`, `two_factor`, `role`, `permission`, `key_counter`, and `key_value`.
    - Organization-owned domain records should carry `organization_id`, scope common reads/writes through the active organization, and use tenant-aware uniqueness/indexes such as `(organization_id, slug)` or `(organization_id, created_at)` when those are the real access patterns.
    - User-owned records may stay keyed by `user_id` when the data is intentionally shared across the user's organizations. If the data can differ per organization, model it as organization-owned, usually keyed or constrained by `(organization_id, user_id)`.
    - Tenant-scoped actor references such as `created_by`, `updated_by`, `approved_by`, or `deleted_by` should include `organization_id` and use composite foreign keys to the tenant membership relationship, currently `member(organization_id, user_id)`.
    - Treat `_by` as actor-reference guidance only when the field represents a user actor, not domain/display text fields such as `posted_by`, `filed_by`, or `requested_by` unless they are intentionally modeled as user references.
    - Add matching composite indexes only when they support common tenant-scoped queries or foreign-key maintenance paths.
    - When a predicted Drizzle/Postgres constraint or index name would exceed 63 characters, generate and pass an explicit name instead of relying on default naming. Use `table_name_<INDEX_TYPE>_<random_6_alphanumeric>`, where `<INDEX_TYPE>` matches the construct (`idx`, `unique`, `fk`, `pk`, or `check`) and `<random_6_alphanumeric>` is 6 random lowercase `a-z`/`0-9` characters.
    - Do not add a separate index for a primary key column.
    - Do not add duplicate single-column indexes when a primary key, unique constraint, or existing index already covers the access pattern.
    - Before adding an index, check whether an existing composite index or unique constraint already provides left-prefix coverage, such as `(organization_id, user_id)` covering filters by `organization_id`.

# Validators (`packages/validator`)

- **Depends on:** `@PROJECT_NAME/types` (tsconfig project reference + workspace dependency).

1.  **Shared Validators (`@PROJECT_NAME/validator/shared`):**
    - `field.ts` — Low-level Zod field builders (`vBoolean`, `vInt`, `vNumeric`, `vText`) accepting `{ fieldName, message, min, max }`.
    - `base.ts` — Composed schemas: `addressInputSchema`, `readManyInputSchema` (limit/offset/sort), `outputSchema<Data>`.
    - `refinement.ts` — Custom `.check()` callbacks: `dateString()`, `password()` (uppercase + lowercase + numeric + symbol), `updatedFields()`.
2.  **App Validators:** Domain-specific schemas are mirrored by app surface:
    - `@PROJECT_NAME/validator/public/*` from `packages/validator/src/public`.
    - `@PROJECT_NAME/validator/backoffice/*` from `packages/validator/src/backoffice`.
    - Current feature groups include `auth`, `user`, `admin/user`, and `objectStorage`.
3.  **Adding a New Validator:**
    - Create `*.schema.ts` in the appropriate `public/` or `backoffice/` subdirectory using shared field builders and refinements.
    - Prefer composing schemas from shared base fields (`vBoolean`, `vInt`, `vNumeric`, `vText`) and shared composed schemas from `base.ts` wherever they fit. Reach for raw `z.*` primitives only when the validator needs behavior not covered by the shared builders.
    - Re-export from the nearest `index.ts`.
    - Add a named export entry to `packages/validator/package.json` exports map.
    - Rebuild: `pnpm --filter=@PROJECT_NAME/validator build`.
