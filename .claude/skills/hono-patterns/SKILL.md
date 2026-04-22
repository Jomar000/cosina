---
name: hono-patterns
description: Coding rules for Hono API routes, middleware, error handling, validation, and observability logging. Use this when implementing or modifying Hono API routes, middleware, or error handling.
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

## Observability & Logging

### Structured Log Format

All structured logs use `console.log(JSON.stringify({...}))` for info-level and `console.error(JSON.stringify({...}))` for errors. Every log entry must have a top-level `type` field identifying the log category. This format is natively indexed by the Cloudflare Workers Observability dashboard.

```typescript
// info
console.log(JSON.stringify({ type: 'MY_EVENT', requestId, ... }))
// error
console.error(JSON.stringify({ type: 'MY_ERROR', ...serializeError(err) }))
```

### Request Timer Middleware

`apps/api-{public,backoffice}/src/core/middleware/requestTimer.ts` — already registered in `core/index.ts` immediately after the `requestId` middleware. Do not re-register it.

It uses `createMiddleware<THonoInstance>` and reads `correlationId` **after** `await next()` so that `initContext` (which sets `correlationId`) has already run:

```typescript
export const requestTimer = createMiddleware<THonoInstance>(async (ctx, next) => {
    const start = Date.now()
    await next()
    console.log(JSON.stringify({
        type: 'REQUEST',
        requestId: ctx.get('requestId'),
        correlationId: ctx.get('correlationId') ?? 'N/A',
        method: ctx.req.method,
        path: new URL(ctx.req.url).pathname,
        status: ctx.res.status,
        durationMs: Date.now() - start,
        environment: ctx.env.ENVIRONMENT,
    }))
})
```

The middleware registration order in `core/index.ts` is: `requestId` → `requestTimer` → status-check → routes.

### WebSocket Observability (Durable Objects)

`apps/api-{public,backoffice}/src/core/durableObject/webSocketServer.ts` provides three module-level helpers — use them for all WebSocket logging, do not inline `console.*` calls:

```typescript
const wsLog   = (entry: Record<string, unknown>) => console.log(JSON.stringify(entry))
const wsError = (entry: Record<string, unknown>) => console.error(JSON.stringify(entry))
const serializeError = (err: unknown) => ({
    name:    err instanceof Error ? err.name    : 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : String(err),
    stack:   err instanceof Error ? err.stack   : undefined,
})
```

Event `type` strings are ALL_CAPS: `WS_CONNECT`, `WS_CLOSE`, `WS_CLOSE_ERROR`, `WS_ERROR`, `WS_MESSAGE_PARSE_ERROR`, `WS_MESSAGE_SEND_ERROR`.

Every `WebSocketServer` must implement the `webSocketError(ws, error)` lifecycle handler — Durable Objects require an explicit handler or errors are silently swallowed.

### Audit Trail

`auditTrailLogger(ctx, payload, client?)` in `apps/api-{public,backoffice}/src/utilities.ts`.

- **Standalone call** (no surrounding transaction): omit the third argument — it defaults to `ctx.get('dbClient')`.
- **Inside a Drizzle `.transaction()` callback**: pass the transaction object `tx` as the third argument so the audit row rolls back atomically if the business write fails.

```typescript
// standalone
await auditTrailLogger(ctx, { component, action, description })

// inside a transaction
await db.transaction(async (tx) => {
    await tx.update(...)
    await auditTrailLogger(ctx, { component, action, description }, tx)
})
```

Required payload fields: `component`, `action`, `description`. Optional: `records` (`{ table: string; id: string; dataOld?: unknown; dataNew?: unknown }` or an array of the same — pass an array when a single operation touches multiple tables; `dataOld`/`dataNew` capture before/after state per record). `organizationId`, `userId`, `ipAddress`, and `userAgent` are sourced automatically from the Hono context.
