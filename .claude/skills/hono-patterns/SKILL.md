---
name: hono-patterns
description: Coding rules for Hono API routes, middleware, error handling, validation, and observability logging. Use this when implementing or modifying Hono API routes, middleware, or error handling.
---

# Hono (Backend)

1.  **Middleware:** Use middleware to normalize environment variables across runtimes (Cloudflare `env` vs. Node/Bun `process.env`).
    - For auth, permission, validation-adjacent, or route-specific guards in single-endpoint child route files, attach middleware directly to the route handler:
        ```typescript
        new Hono<THonoInstance>().get(
            '/read',
            isAuthorized({ order: ['read'] }),
            validateRequest('query', schema),
            async (ctx) => { ... },
        )
        ```
    - Avoid unscoped `.use(middleware)` inside child route apps that are mounted with `.route('/', childRoute)`. In Hono, unscoped middleware can apply to sibling mounted routes depending on mount order.
    - If a middleware is intentionally shared by every endpoint in a child app, either mount that child app at a unique path or scope the middleware with `.use('/exactPath', middleware)` / `.use('/prefix/*', middleware)` so its reach is explicit.
    - Use camelCase for Hono route names: every static URL path segment, compound route directory or filename, and exported route app identifier. Examples: `/objectStorage`, `/resetRequest`, `/signIn/email`, `objectStorage/uploadAttachment.ts`, and `uploadAttachmentRoute`. Do not introduce kebab-case or snake_case Hono route names. Framework-owned external endpoints and SvelteKit page routes follow their respective conventions.
    - Mount HTTP routes below `/api` and keep final `.route(...)` declarations alphabetized.
    - Add route families to the narrowest applicable group: `securityApiRoutePatterns` provides default CORS/CSRF; `contextApiRoutePatterns` provides request/database/auth context and includes WebSockets. Do not restore broad `/*` middleware.
    - Keep exceptions self-contained: heartbeat uses default CORS/CSRF; v1 uses reflected non-credentialed CORS plus request context; WebSockets run `wsOriginGuard()` before shared context and omit HTTP CORS/CSRF.
2.  **Context:** Use the app-specific `THonoInstance`, `THonoBindings`, and `THonoVariables` types from `apps/api-{public,backoffice}/src/types.ts`. Bindings include Hyperdrive, KV, and the WebSocket Durable Object namespace. Object storage does not use a direct R2 bucket binding; use the `aws4FetchClient` Hono variable to sign S3-compatible R2 requests from the configured `CF_R2_*` vars/secrets.
    - Prefer the split context middleware from `initContext.ts`. Mount only what each route needs, keep object-storage context scoped to `/objectStorage/*`, and reserve `initContext()` for compatibility cases needing every context value.
3.  **Error Handling:** Use the standardized response wrappers in `apps/api-{public,backoffice}/src/utilities/helpers.ts`. Do not throw raw exceptions — throw `AppError` (from the matching app's `src/errors.ts`) instead, which the global `.onError` handler catches.
    - **Success:** `apiResponseOkWrapper(ctx, { data, count?, limit?, offset? })` → `{ success: true, data, ... }`
    - **Error:** `apiResponseErrorWrapper(ctx, { code, message, validatorIssues?, status? })` → `{ success: false, error: { requestId, code, message, validatorIssues? } }`
    - **Types:** `TApiResponse<T>`, `TApiResponseOk<T>`, `TApiResponseError` from `@PROJECT_NAME/types/shared`.
    - **Discriminated unions:** `TApiResponseOk<T>` uses `error?: null` and `TApiResponseError` uses `data?: null` so Hono client responses can be destructured before checking `success`.
    - **Zod:** `outputSchema(dataSchema)` from `@PROJECT_NAME/validator/shared` for RPC type safety. The schema includes the `success` discriminant and `requestId` in error responses, matching the types exactly.
4.  **Validation:** Use `validateRequest(target, schema)` from `apps/api-{public,backoffice}/src/core/middleware/validateRequest.ts`. It wraps `@hono/zod-validator` and returns `code: "DATA_VALIDATION"` with Zod issues on failure.
5.  **Imports:** Group imports with installed package dependencies first, then external/local file references second. Sort import statements alphabetically by module specifier within each group. Prefer `import type` for type-only Hono app types such as `THonoInstance`, `THonoBindings`, and `THonoVariables`.
6.  **Status Transitions:** For every API endpoint that changes a persisted status, implement a guarded status transition. Define the allowed source statuses and reject requests when the record is no longer in one of them. Use an atomic conditional write such as `WHERE id = ... AND status IN (...)`, or equivalent transaction locking when multiple related writes are required. Do not rely only on a separate read-before-write check because concurrent requests can race. When no eligible row is updated, throw a domain-specific `AppError` with `status: 409`. For example, for `/cancel`, allow only cancellable source statuses: the first eligible request succeeds, while a repeated or concurrent cancel request receives `409 Conflict`.
7.  **Idempotent Creates:** For non-idempotent create endpoints where retry can duplicate records, counters, audit rows, WebSocket messages, or external calls, require a client-generated UUID v7 `idempotencyKey` in the request body. Inside the create transaction, acquire `pg_advisory_xact_lock(hashtextextended(idempotencyKey, 0))`, look up an existing row by the key, and return the original success response on replay. Only the first request should insert primary/secondary rows, increment counters, write audit logs, send WebSocket messages, or call external services. Keep guarded status transitions such as cancel, serve, update, and complete protected by atomic status guards instead of idempotency keys.
8.  **Tests:** Add matching Worker Vitest coverage under `apps/api-{public,backoffice}/test/`. Use `*.con.test.ts` for independent cases and `*.seq.test.ts` for ordered or stateful flows. Cover success, guards, validation, and new domain errors. Route hierarchy changes must verify `/api` mounts, retired paths, and heartbeat/v1/WebSocket policy isolation. Guarded transitions need valid, repeated `409`, and concurrent single-winner cases. State why a code-only refactor needs no new tests.

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

It uses `createMiddleware<THonoInstance>` and logs in a `finally` block so thrown requests still emit timing logs. Read `correlationId` after `await next()` where possible so that `initContext` (which sets `correlationId`) has already run; thrown requests that fail before `initContext` should log `N/A`.

```typescript
import { AppError } from '../../errors.js'

export const requestTimer = createMiddleware<THonoInstance>(
    async (ctx, next) => {
        const start = Date.now()
        let thrownStatus: number | undefined

        try {
            await next()
        } catch (err) {
            thrownStatus = err instanceof AppError ? err.status : 500
            throw err
        } finally {
            console.log(
                JSON.stringify({
                    type: 'REQUEST',
                    requestId: ctx.get('requestId'),
                    correlationId: ctx.get('correlationId') ?? 'N/A',
                    method: ctx.req.method,
                    path: new URL(ctx.req.url).pathname,
                    status: thrownStatus ?? ctx.res.status,
                    durationMs: Date.now() - start,
                    environment: ctx.env.ENVIRONMENT,
                }),
            )
        }
    },
)
```

The middleware registration order in `core/index.ts` is: `requestId` → `requestTimer` → status-check → routes.

### WebSocket Observability (Durable Objects)

`apps/api-{public,backoffice}/src/core/durableObject/webSocketServer.ts` provides three module-level helpers — use them for all WebSocket logging, do not inline `console.*` calls:

```typescript
const wsLog = (entry: Record<string, unknown>) =>
    console.log(JSON.stringify(entry))
const wsError = (entry: Record<string, unknown>) =>
    console.error(JSON.stringify(entry))
const serializeError = (err: unknown) => ({
    name: err instanceof Error ? err.name : 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
})
```

Event `type` strings are ALL_CAPS: `WS_CONNECT`, `WS_CLOSE`, `WS_CLOSE_ERROR`, `WS_ERROR`, `WS_MESSAGE_PARSE_ERROR`, `WS_MESSAGE_SEND_ERROR`.

Every `WebSocketServer` must implement the `webSocketError(ws, error)` lifecycle handler — Durable Objects require an explicit handler or errors are silently swallowed.

### Audit Trail

`auditTrailLogger(ctx, payload, client?)` in `apps/api-{public,backoffice}/src/utilities/helpers.ts`.

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

Required payload fields: `component`, `action`, `description`. Optional: `records` (`{ table: string; id: string; oldData?: unknown }` or an array of the same — pass an array when a single operation touches multiple tables; populate `oldData` with the row's mutable fields fetched before the update, so the audit trail captures what changed). `organizationId`, `userId`, `ipAddress`, and `userAgent` are sourced automatically from the Hono context.

**`component` naming convention:** dot-separated path mirroring the route file's directory structure, with compound filenames in camelCase. Pattern: `<dir>.<dir>.<filename>`. Examples: `auth`, `user.profile`, `admin.user.profile`, `admin.user.password`, `objectStorage.upload`, `objectStorage.uploadAttachment`.

**`action` naming convention:** derived from the camelCase route endpoint path. Strip the leading slash and join path segments with `.`. Examples:

- `/create` → `create`
- `/commit` → `commit`
- `/update` → `update`, `/reset` → `reset`, `/signOut` → `signOut`
- `/resetRequest` → `resetRequest`
- Path segments joined with `.`: `/update/address` → `update.address`, `/password/change` → `password.change`, `/password/reset` → `password.reset`, `/password/resetRequest` → `password.resetRequest`
- Dot-suffix for sub-variants sharing a handler: `/signIn/email` → `signIn.email`, `/signIn/username` → `signIn.username`
