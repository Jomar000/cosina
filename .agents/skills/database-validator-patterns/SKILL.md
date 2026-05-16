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

# Validators (`packages/validator`)

- **Depends on:** `@hyperion/types` (tsconfig project reference + workspace dependency).

1.  **Shared Validators (`@hyperion/validator/shared`):**
    - `field.ts` — Low-level Zod field builders (`vBoolean`, `vInt`, `vNumeric`, `vText`) accepting `{ fieldName, message, min, max }`.
    - `base.ts` — Composed schemas: `addressInputSchema`, `readManyInputSchema` (limit/offset/sort), `outputSchema<Data>`.
    - `refinement.ts` — Custom `.check()` callbacks: `dateString()`, `password()` (uppercase + lowercase + numeric + symbol), `updatedFields()`.
2.  **App Validators:** Domain-specific schemas are mirrored by app surface:
    - `@hyperion/validator/public/*` from `packages/validator/src/public`.
    - `@hyperion/validator/backoffice/*` from `packages/validator/src/backoffice`.
    - Current feature groups include `auth`, `user`, `admin/user`, and `objectStorage`.
3.  **Adding a New Validator:**
    - Create `*.schema.ts` in the appropriate `public/` or `backoffice/` subdirectory using shared field builders and refinements.
    - Re-export from the nearest `index.ts`.
    - Add a named export entry to `packages/validator/package.json` exports map.
    - Rebuild: `pnpm --filter=@hyperion/validator build`.
