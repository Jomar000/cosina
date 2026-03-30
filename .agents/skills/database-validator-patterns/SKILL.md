---
name: database-validator-patterns
description: Rules for Drizzle ORM schema changes and queries, and for adding or modifying Zod validators. Use this when modifying the database schema, writing Drizzle queries, or adding/updating Zod validators.
---

# Drizzle & Database

1.  **Schema Changes:** Strictly modify schema in `packages/database/src/postgres/schema.ts`.
2.  **Queries:**
    - Use the query builder syntax (`db.query.users.findMany(...)`) for readability.
    - Avoid raw SQL (`sql` template tag) unless absolutely necessary for performance.

# Validators (`packages/validator`)

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
