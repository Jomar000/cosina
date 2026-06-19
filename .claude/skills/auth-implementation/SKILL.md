---
name: auth-implementation
description: Project rules for better-auth initialization, authentication strategies, session storage, authorization, and cookies. Use when implementing auth behavior or fixing authentication and permission bugs.
---

# Authentication (better-auth)

1. **Ownership:** Keep `src/auth/index.ts` app-specific. Call `initAuthContext()` per request after request/database context on `contextApiRoutePatterns`; never use a global auth singleton.
2. **Strategies:** Support Email + Password with custom scrypt via `@noble/hashes`, Email OTP via Resend, and the Username plugin. Google OAuth env values are reserved but not wired.
3. **Organizations and ACL:** Use the `organization` plugin with DB/KV-backed custom roles and permissions built by `aclBuilder` in `src/auth/acl.ts`.
4. **Sessions:** Store sessions primarily in Postgres and secondarily in Cloudflare KV (`PROJECT_NAME{PUB|BOFC}_KV`) through `secondaryStorage`. Clamp KV TTL values below 60 seconds to 60 seconds.
5. **Middleware:** Run `isAuthenticated` before `isAuthorized(permissions)`. Authentication populates `session`, `user`, `role`, and `isPrivilegedRole` Hono context variables; authorization calls `auth.api.hasPermission`.
6. **Cookies:** Use browser-enforced, host-only `__Host-` names with `secure: true`, `path: "/"`, no `domain`, `partitioned`, and `sameSite: "strict"`. Use `__Host-session_token` and `__Host-csrf_token` in production; prefix both names with the full environment value outside production. Override Better Auth's complete session cookie name so it appends neither its default `better-auth` prefix nor another `session_token` suffix, and prevent it from prepending `__Secure-`.
