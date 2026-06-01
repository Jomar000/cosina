---
name: hono-patterns
description: Coding rules for Hono API routes, middleware, error handling, and validation. Use this when implementing or modifying Hono API routes, middleware, or error handling.
---

# Hono (Backend)

1.  **Middleware:** Use middleware to normalize environment variables across runtimes (Cloudflare `env` vs. Node/Bun `process.env`).
2.  **Context:** Always type the Hono `Context` with the specific environment bindings (e.g., D1 Database, R2 Bucket, KV Namespace).
3.  **Error Handling:** Use the standardized response wrappers in `apps/api-public/src/utilities.ts`. Do not throw raw exceptions — throw `AppError` (from `apps/api-public/src/errors.ts`) instead, which the global `.onError` handler catches.
    - **Success:** `apiResponseOkWrapper(ctx, { data, count?, limit?, offset? })` → `{ success: true, data, ... }`
    - **Error:** `apiResponseErrorWrapper(ctx, { code, message, validatorIssues?, status? })` → `{ success: false, error: { requestId, code, message, validatorIssues? } }`
    - **Types:** `TApiResponse<T>`, `TApiResponseOk<T>`, `TApiResponseError` from `@hyperion/types/shared`.
    - **Zod:** `outputSchema(dataSchema)` from `@hyperion/validator/shared` for RPC type safety. The schema includes the `success` discriminant and `requestId` in error responses, matching the types exactly.
4.  **Validation:** Use `validatorCallback` from `utilities.ts` which runs `safeParseAsync` and returns `code: "DATA_VALIDATION"` with Zod issues on failure.
