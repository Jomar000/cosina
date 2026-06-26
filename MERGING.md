# Merging Template Updates Into Forks

This repository is a global template. Downstream projects may have local product changes, so template updates should be merged deliberately instead of copied over wholesale.

## Recommended Workflow

1. Start from a clean working tree in the fork.

    ```bash
    git status
    ```

2. Add or refresh the template remote if needed.

    ```bash
    git remote add template <template-repo-url>
    git fetch template
    ```

    These commands mutate repository configuration and contact a remote. Run them manually or with explicit approval.

3. Create an integration branch from the fork's target branch.

    ```bash
    git checkout main
    git pull
    git checkout -b chore/merge-template-updates
    ```

    Branch checkout, pull, and creation are mutating Git operations. Run them manually or with explicit approval.

4. Merge the template branch without committing immediately.

    ```bash
    git merge --no-commit --no-ff template/main
    ```

    Run the merge manually or with explicit approval.

5. Resolve conflicts by keeping fork-specific product behavior and applying template structure changes around it.

6. Normalize the lockfile from the repo root after dependency conflicts are resolved.

    ```bash
    pnpm install
    ```

7. Run checks before committing. Use the fork's actual package names.

    ```bash
    pnpm --filter=<api-public-package> check
    pnpm --filter=<api-backoffice-package> check
    pnpm --filter=<api-public-package> lint
    pnpm --filter=<api-backoffice-package> lint
    pnpm --filter=<web-public-package> check
    pnpm --filter=<web-backoffice-package> check
    pnpm --filter=<web-public-package> lint
    pnpm --filter=<web-backoffice-package> lint
    ```

8. Review the final diff, then commit.

    ```bash
    git diff
    git status
    git commit
    ```

    Committing is a developer-run or explicitly approved action.

## Conflict Resolution Rules

- Preserve fork-specific routes, API calls, copy, branding, permissions, database behavior, and business logic.
- Prefer template changes for shared structure, tooling, agent guidelines, and framework conventions.
- Do not overwrite fork-specific environment files such as `.dev.vars`, `.env`, or deployment configs unless the fork intentionally wants the template defaults.
- Keep `pnpm-lock.yaml` from the merge result, then run `pnpm install` once from the repo root.
- Keep `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.agents/skills/`, and `.claude/skills/` synchronized when resolving agent guideline conflicts.

## Hono API Merging

Apply the same strategy to `apps/api-public` and `apps/api-backoffice`: preserve fork-specific business behavior, but adopt template-level route, middleware, validation, error handling, and observability conventions.

When resolving API conflicts:

- Keep the public and backoffice BFF apps separate. Do not move fork-only admin behavior into the public API or public client behavior into the backoffice API.
- Preserve fork-specific route paths and response semantics unless the template intentionally fixes a shared contract.
- Prefer the template's Hono app setup, middleware registration, and global error handling when conflicts touch shared API infrastructure.
- Keep app-specific Hono types from each API app's `src/types.ts`, including `THonoInstance`, `THonoBindings`, and `THonoVariables`.
- Use `validateRequest(target, schema)` for request validation and keep matching Zod validators in the validator package.
- Use the standardized response helpers and `AppError`; do not reintroduce raw thrown exceptions or ad hoc JSON response shapes.
- Keep structured logging and request timing middleware from the template. If a fork has additional logs, convert them to the structured JSON format with a top-level `type`.
- Preserve fork-specific Cloudflare bindings and `[vars]` in `wrangler.toml`. Add new template bindings only when the fork actually needs them.
- Preserve fork-specific secrets in `.dev.vars` and never copy committed examples over real local secret files.
- For Durable Objects and WebSocket routes, keep the template lifecycle handlers and logging helpers, especially explicit `webSocketError` handling.
- For database writes, keep fork-specific transaction behavior and pass transaction clients into `auditTrailLogger` when audit rows should roll back with the business write.

After resolving API conflicts, search for patterns that usually indicate stale or non-standard API code:

```bash
rg "throw new Error|ctx\\.json\\(|console\\.(log|error)\\(|zValidator\\(" apps/api-public apps/api-backoffice
```

Review each result carefully. Some direct `ctx.json` or `console.*` calls may be legitimate framework glue, but route handlers should generally use the shared response wrappers and structured logging rules from `hono-patterns`.

Run API checks with the fork's package names:

```bash
pnpm --filter=<api-public-package> check
pnpm --filter=<api-backoffice-package> check
pnpm --filter=<api-public-package> lint
pnpm --filter=<api-backoffice-package> lint
```

## Svelte Component Reorganization

This template standardizes Svelte app components into shared app-level components and module-specific components.

Shared app-level reusable components now live under:

```text
apps/web-*/src/lib/components/
  loader/
  modal/
  sidebar/
  upload/
```

Module-specific components now live under:

```text
apps/web-*/src/lib/modules/<module>/components/
```

For this template update, the important path changes are:

```text
src/lib/components/default/loading-screen.svelte
-> src/lib/components/loader/LoadingScreen.svelte

src/lib/components/default/modal-captcha.svelte
-> src/lib/components/modal/CaptchaModal.svelte

src/lib/components/default/sidebar*.svelte
-> src/lib/components/sidebar/Sidebar*.svelte

src/lib/components/default/table-upload.svelte
-> src/lib/components/upload/TableUpload.svelte

src/lib/components/default/sign-in.svelte
-> src/lib/modules/auth/components/SignInForm.svelte

src/lib/states/session/provider.svelte
-> src/lib/states/session/SessionProvider.svelte

src/lib/assets/image/_index.ts
-> src/lib/assets/image/index.ts
```

Update imports to match the new paths. Examples:

```ts
import LoadingScreen from '$lib/components/loader/LoadingScreen.svelte'
import CaptchaModal from '$lib/components/modal/CaptchaModal.svelte'
import AppSidebar from '$lib/components/sidebar/Sidebar.svelte'
import SignInForm from '$lib/modules/auth/components/SignInForm.svelte'
```

## Handling Fork-Specific Svelte Components

When a fork has custom components in `src/lib/components/default`, classify each one before moving it:

- If it is reused across multiple modules, move it to `src/lib/components/<group>/ComponentName.svelte`.
- If it belongs to one feature or workflow, move it to `src/lib/modules/<module>/components/ComponentName.svelte`.
- Keep Svelte component files as `PascalCase.svelte`.
- Keep route directories as `kebab-case`.
- Keep utility and non-component modules as `camelCase`.

Avoid adding new barrel files for component folders unless the fork already has a clear public component API. State modules such as `src/lib/states/session` may keep an `index.ts` barrel for their public surface.

## Post-Merge Checklist

- Search for stale Svelte paths:

    ```bash
    rg "components/default|components/form|provider\\.svelte|_index|sidebar-nav-|modal-captcha|loading-screen|table-upload|sign-in\\.svelte" apps/web-public apps/web-backoffice
    ```

- Search for stale or non-standard API patterns:

    ```bash
    rg "throw new Error|ctx\\.json\\(|console\\.(log|error)\\(|zValidator\\(" apps/api-public apps/api-backoffice
    ```

- Confirm shared skill files match across agent variants:

    ```bash
    git diff --no-index -- .agents/skills .claude/skills
    ```

- Run app checks and lint.
- Smoke-test API health/status routes, auth routes, object storage routes, WebSocket/Durable Object flows, and any fork-specific route groups touched by the merge.
- Smoke-test sign-in, loading, captcha modal, sidebar layouts, and upload flows if the fork uses them.

## If The Merge Is Too Noisy

For forks with heavy UI or API customization, it may be easier to apply the structural migration manually before merging the remaining template changes.

For Svelte apps:

1. Create the new `components/` and `modules/` folders.
2. Move one component family at a time.
3. Update imports after each move.
4. Run `pnpm --filter=<web-app-package> check` after each group.

For Hono API apps:

1. Merge shared API infrastructure first: app bootstrap, middleware registration, error handling, request validation helpers, response wrappers, and logging utilities.
2. Reapply fork-specific route handlers onto the updated infrastructure one route group at a time.
3. Keep fork-specific validators and database queries, but align their request validation and response wrapping with `hono-patterns`.
4. Preserve fork-specific Cloudflare bindings and secrets while adding only the template bindings the fork needs.
5. Run `pnpm --filter=<api-app-package> check` after each route group.

Once the fork already matches the major frontend and API structure, merge the remaining template changes.
