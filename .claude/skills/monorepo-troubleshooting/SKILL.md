---
name: monorepo-troubleshooting
description: Project rules for pnpm workspace dependencies, package boundaries, build order, and local setup. Use when diagnosing build or dependency errors, adding packages, or changing the workspace graph.
---

# Monorepo Troubleshooting

`PROJECT_NAME` is the reusable template token for the package scope; it resolves to `hyperion` in this repository, so `@PROJECT_NAME/types` means `@hyperion/types`.

## Dependency Graph

Build order is:

1. `@PROJECT_NAME/types`, `@PROJECT_NAME/database`, and `@PROJECT_NAME/ui` in parallel.
2. `@PROJECT_NAME/validator`, which depends on `types`.
3. `@PROJECT_NAME/api-public` and `@PROJECT_NAME/api-backoffice`, which depend on `types`, `validator`, and `database`.
4. `@PROJECT_NAME/web-public` and `@PROJECT_NAME/web-backoffice`, which depend on their matching API plus `types`, `validator`, and `ui`.

Let pnpm derive this order from `workspace:*`; do not add Turborepo or Nx.

Shared packages (`types`, `database`, `ui`, and `validator`) auto-build on install through `"prepare": "pnpm build"`. The root `prepare` runs Husky, and web app `prepare` scripts run `svelte-kit sync`; do not assume every workspace `prepare` builds a package.

## Dependency Rules

- Centralize shared third-party versions in the root `pnpm-workspace.yaml` catalog and reference them with `catalog:`.
- Reference internal packages with `workspace:*`.
- Keep `engineStrict: true`; root `package.json` defines supported Node and pnpm versions.
- Keep modules imported into Cloudflare Worker bundles runtime-agnostic. Node-only scripts such as database bootstrap and migration entrypoints may use Node APIs when they are not exported through a Worker runtime package surface.
- API apps are private Wrangler bundles, so their own builds ignore the `dependencies`/`devDependencies` distinction. Put only dependencies needed by web consumers to resolve exported Hono route types in `dependencies`.
- Put server-only API packages in `devDependencies` so they do not leak transitively into frontend apps. See each API app's `package.json` `README` key.
