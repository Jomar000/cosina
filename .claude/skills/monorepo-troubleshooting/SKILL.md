---
name: monorepo-troubleshooting
description: Details about the pnpm workspace dependency graph, package boundaries, and local environment setup. Use this when fixing build errors or setting up new packages.
---

# Monorepo Build Details

## Build Order / Dependency Graph

```
Level 0 (parallel, no inter-dependencies):
  @PROJECT_NAME/types       (no workspace deps)
  @PROJECT_NAME/database    (no workspace deps)
  @PROJECT_NAME/ui          (no workspace deps)

Level 1 (depends on Level 0):
  @PROJECT_NAME/validator   (depends on types)

Level 2 (depends on Level 0 + 1):
  @PROJECT_NAME/api-public      (depends on types + validator + database)
  @PROJECT_NAME/api-backoffice  (depends on types + validator + database)

Level 3 (depends on Level 0–2):
  @PROJECT_NAME/web-public      (depends on api-public + types + validator + ui)
  @PROJECT_NAME/web-backoffice  (depends on api-backoffice + types + validator + ui)
```

pnpm resolves this order automatically from `workspace:*` declarations. Shared packages (`@PROJECT_NAME/types`, `@PROJECT_NAME/database`, `@PROJECT_NAME/ui`, `@PROJECT_NAME/validator`) auto-build on install via `"prepare": "pnpm build"`. The root `prepare` script runs Husky, and web app `prepare` scripts run `svelte-kit sync`; do not treat every workspace `prepare` as a package build. No Turborepo/Nx pipeline needed.

Workspace dependency versions are centralized through the root `pnpm-workspace.yaml` catalog, with `engineStrict: true` enforcing the root `package.json` Node and pnpm engine ranges. Prefer `catalog:` for shared third-party dependencies and `workspace:*` for internal packages.

## Dependency Strategy for `api-public` / `api-backoffice`

These are private packages bundled by Nitro. `dependencies` lists only what consumers (e.g., `web-public`) need for type resolution of the exported Hono routes. Server-only packages live in `devDependencies` to avoid leaking them transitively into frontend apps. See the `README` key in each app's `package.json`.

## API Runtime Checks

The API apps are Nitro v3-owned. Use `apps/api-{public,backoffice}/nitro.config.ts` as the canonical runtime/deploy config, with generated Cloudflare config written to `.output/server/wrangler.json`. The Cloudflare runtime preset is `cloudflare_durable`; Node and Bun builds are separate compatibility outputs, not the default test runner.

- Backoffice local Nitro port: `8080`.
- Public local Nitro port: `8081`.
- Use `build:cloudflare` before Wrangler preview/deploy commands.
- Use `build:node` or `build:bun` only when validating those runtime outputs.
- API tests use plain Vitest on Node and should be run one app at a time because both API suites share the `hyperion_test` database bootstrap target.
