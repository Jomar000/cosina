---
name: monorepo-troubleshooting
description: Details about the pnpm workspace dependency graph, package boundaries, and local environment setup. Use this when fixing build errors or setting up new packages.
---

# Monorepo Build Details

## Build Order / Dependency Graph

```
Level 0 (parallel, no inter-dependencies):
  @hyperion/types       (no workspace deps)
  @hyperion/database    (no workspace deps)
  @hyperion/ui          (no workspace deps)

Level 1 (depends on Level 0):
  @hyperion/validator   (depends on types)

Level 2 (depends on Level 0 + 1):
  @hyperion/api-public      (depends on types + validator + database)
  @hyperion/api-backoffice  (depends on types + validator + database)

Level 3 (depends on Level 0–2):
  @hyperion/web-public      (depends on api-public + types + validator + ui)
  @hyperion/web-backoffice  (depends on api-backoffice + types + validator + ui)
```

pnpm resolves this order automatically from `workspace:*` declarations. Shared packages (`@hyperion/types`, `@hyperion/database`, `@hyperion/ui`, `@hyperion/validator`) auto-build on install via `"prepare": "pnpm build"`. The root `prepare` script runs Husky, and web app `prepare` scripts run `svelte-kit sync`; do not treat every workspace `prepare` as a package build. No Turborepo/Nx pipeline needed.

## Dependency Strategy for `api-public` / `api-backoffice`

These are private packages bundled by wrangler — the `dependencies` vs `devDependencies` split has no effect on their own builds. `dependencies` lists only what consumers (e.g., `web-public`) need for type resolution of the exported Hono routes. Server-only packages live in `devDependencies` to avoid leaking them transitively into frontend apps. See the `README` key in each app's `package.json`.
