---
name: hono-patterns
description: Project rules for Hono routes, middleware, context, validation, response contracts, concurrency controls, tests, observability, WebSockets, and audit trails. Use when implementing or modifying backend API behavior.
---

# Hono Backend

## Routes and Middleware

- Normalize runtime environment variables through middleware; shared code must not depend directly on Node/Bun `process.env`.
- In single-endpoint child apps, attach auth, permission, validation, and route guards directly to the handler:

```typescript
new Hono<THonoInstance>().get(
    '/read',
    isAuthorized({ order: ['read'] }),
    validateRequest('query', schema),
    async (ctx) => { ... },
)
```

- Do not use unscoped `.use(middleware)` in child apps mounted with `.route('/', childRoute)`; it can affect sibling routes by mount order.
- For middleware shared by every child endpoint, mount the child at a unique path or scope middleware with `.use('/exactPath', middleware)` or `.use('/prefix/*', middleware)`.
- Use camelCase for static URL segments, compound route directories/files, and exported route identifiers: `/objectStorage`, `/resetRequest`, `/signIn/email`, `objectStorage/uploadAttachment.ts`, `uploadAttachmentRoute`. Framework-owned external endpoints and SvelteKit routes follow their own conventions; do not introduce kebab-case or snake_case Hono names.
- Mount all HTTP routes below `/api` and alphabetize final `.route(...)` declarations.
- Add route families to the narrowest group: `securityApiRoutePatterns` supplies default CORS/CSRF; `contextApiRoutePatterns` supplies request/database/auth context and includes WebSockets. Never restore broad `/*` middleware.
- Keep exceptions self-contained: heartbeat uses default CORS/CSRF; v1 uses reflected non-credentialed CORS plus request context; WebSockets run `wsOriginGuard()` before shared context and omit HTTP CORS/CSRF.

## Context

- Use app-specific `THonoInstance`, `THonoBindings`, and `THonoVariables` from `apps/api-{public,backoffice}/src/types.ts`.
- Bindings include Hyperdrive, KV, and the WebSocket Durable Object namespace.
- Object storage has no direct R2 binding. Sign S3-compatible requests with the `aws4FetchClient` context variable configured from `CF_R2_*` vars and secrets.
- Prefer split middleware from `initContext.ts`. Mount only required context, scope object-storage context to `/objectStorage/*`, and reserve `initContext()` for compatibility cases needing every value.

## Responses, Errors, and Validation

- Use wrappers from `apps/api-{public,backoffice}/src/utilities/helpers.ts`:
  - `apiResponseOkWrapper(ctx, { data })` returns `{ success: true, data }`.
  - `apiResponsePaginatedOkWrapper(ctx, { data, count, limit, offset })` returns `{ success: true, data, count, limit, offset }`.
  - `apiResponseErrorWrapper(ctx, { code, message, validatorIssues?, status? })` returns `{ success: false, error: { requestId, code, message, validatorIssues? } }`.
- Use `TApiResponse<T>`, `TApiResponseOk<T>`, `TApiResponsePaginated<T>`, `TApiResponsePaginatedOk<T>`, and `TApiResponseError` from `@PROJECT_NAME/types/shared`.
- Preserve the complete response union until checking `success`; access branch-specific fields only after narrowing. Paginated success requires `count`, `limit`, and `offset`.
- Do not add runtime output validation. Use typed response wrappers and Hono RPC route types for response contracts.
- Validate requests with `validateRequest(target, schema)` from the matching app's `src/core/middleware/validateRequest.ts`. It wraps `@hono/zod-validator` and returns `DATA_VALIDATION` with Zod issues.
- Never throw raw exceptions. Throw the matching app's `AppError`; the global `.onError` handler serializes it.

## Imports

- Group installed package imports before external/local file imports.
- Alphabetize module specifiers within each group.
- Use `import type` for type-only imports, including Hono app types.

## Concurrency and Retry Safety

For every persisted status transition:

- Define allowed source statuses.
- Use an atomic conditional write such as `WHERE id = ... AND status IN (...)`, or transaction locking for related writes.
- Do not rely only on read-before-write checks.
- When no eligible row updates, throw a domain-specific `AppError` with `status: 409`.
- Cover the valid transition, repeated `409`, and concurrent single-winner behavior.

For creates where retries could duplicate records, counters, audit rows, WebSocket messages, or external calls:

- Require a client-generated UUID v7 `idempotencyKey`.
- Inside the create transaction, acquire `pg_advisory_xact_lock(hashtextextended(idempotencyKey, 0))`.
- Look up and return the original success response when the key already exists.
- Only the first request may create primary/secondary rows, increment counters, log audits, send WebSocket messages, or call external services.
- Protect cancel, serve, update, complete, and other guarded transitions with atomic status conditions instead of idempotency keys.

## Tests

- Add Worker Vitest coverage under `apps/api-{public,backoffice}/test/`.
- Use `*.con.test.ts` for independent cases and `*.seq.test.ts` for ordered/stateful flows.
- Cover success, authentication, authorization, origin and route-specific guards, validation, and new domain errors.
- For route hierarchy changes, verify `/api` mounts, retired paths, and heartbeat/v1/WebSocket policy isolation.
- Explain why a code-only refactor needs no new tests.

## Observability

- Emit info logs with `console.log(JSON.stringify({...}))` and errors with `console.error(JSON.stringify({...}))`.
- Give every structured entry a top-level `type`.
- `apps/api-{public,backoffice}/src/core/middleware/requestTimer.ts` is already registered in `core/index.ts`; never re-register it.
- Keep middleware order `requestId` -> `requestTimer` -> status check -> routes.
- The timer uses `createMiddleware<THonoInstance>`, logs in `finally`, and records thrown `AppError.status` or `500`.
- Read `correlationId` after `await next()` when possible; use `N/A` when failure occurs before `initContext`.
- Request logs include `type: 'REQUEST'`, `requestId`, `correlationId`, method, URL pathname, status, duration in milliseconds, and `ctx.env.ENVIRONMENT`.

### WebSockets

- Use the module-level `wsLog`, `wsError`, and `serializeError` helpers in `apps/api-{public,backoffice}/src/core/durableObject/webSocketServer.ts`; do not inline `console.*`.
- Use these event types: `WS_CONNECT`, `WS_CLOSE`, `WS_CLOSE_ERROR`, `WS_ERROR`, `WS_MESSAGE_PARSE_ERROR`, and `WS_MESSAGE_SEND_ERROR`.
- Every `WebSocketServer` must implement `webSocketError(ws, error)` so Durable Object errors are not swallowed.

## Audit Trail

Call `auditTrailLogger(ctx, payload, client?)` from the matching app's `src/utilities/helpers.ts`:

```typescript
await auditTrailLogger(ctx, { component, action, description })

await db.transaction(async (tx) => {
    await tx.update(...)
    await auditTrailLogger(ctx, { component, action, description }, tx)
})
```

- Omit `client` outside a transaction; it defaults to `ctx.get('dbClient')`.
- Pass `tx` inside a transaction so audit and business writes roll back together.
- Require `component`, `action`, and `description`.
- `records` is optional and accepts one `{ table, id, oldData? }` record or an array. Use an array for multi-table operations and populate `oldData` with mutable fields read before updates.
- `organizationId`, `userId`, `ipAddress`, and `userAgent` come from Hono context.
- Name `component` from the route file path with dot-separated camelCase segments: `auth`, `user.profile`, `admin.user.password`, `objectStorage.uploadAttachment`.
- Derive `action` from the camelCase endpoint path by removing the leading slash and joining segments with dots: `/create` -> `create`, `/update/address` -> `update.address`, `/password/resetRequest` -> `password.resetRequest`, `/signIn/email` -> `signIn.email`.
