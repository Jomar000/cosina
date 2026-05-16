---
name: auth-implementation
description: Technical details for better-auth integration, session storage, and permissions. Use this when implementing auth logic or fixing auth bugs.
---

# Authentication (better-auth)

1.  **Ownership:** Auth is owned by both `apps/api-public` and `apps/api-backoffice` (`src/auth/index.ts` in each). Initialized per-request via `initContext` middleware — not a global singleton.
2.  **Strategies:** Email + Password (custom scrypt via `@noble/hashes`), Email OTP (via Resend), Username plugin. Google OAuth is reserved in env but not yet wired.
3.  **Organization & ACL:** `organization` plugin with custom roles/permissions built by `aclBuilder` (`src/auth/acl.ts`), loaded from DB/KV.
4.  **Session Storage:** Primary in Postgres, secondary in Cloudflare KV (`PROJECT_NAME{PUB|BOFC}_KV`) via `secondaryStorage`. KV minimum TTL workaround: any TTL < 60s is clamped to 60s.
5.  **Middleware Chain:** `isAuthenticated` → reads session/user/role into Hono context vars (`ctx.get('session')`, `ctx.get('user')`, `ctx.get('role')`, `ctx.get('isPrivilegedRole')`). `isAuthorized(permissions)` → checks `auth.api.hasPermission`.
6.  **Cookies:** Prefix `sentinel`, `httpOnly`, `partitioned`, `sameSite: "strict"`, `secure: true`, domain from `env.COOKIE_DOMAIN`.
