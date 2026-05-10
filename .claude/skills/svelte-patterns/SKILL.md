---
name: svelte-patterns
description: Coding rules for Svelte/SvelteKit frontend and the shared UI component library. Use this when working on frontend Svelte/SvelteKit code or UI components.
---

# Svelte/SvelteKit

1.  **Reactivity:** Prefer Svelte 5 runes (`$state`, `$derived`, `$effect`) over legacy store syntax where possible.
2.  **Data Fetching:**
    - Do not use `+page.server.ts` for data loading if the app is purely SPA/static.
    - Fetch data client-side using a typed API client wrapper around the Hono backend.
3.  **Components:** Keep business logic outside of `.svelte` files; move complex logic to `.ts` utility files.
4.  **Imports:** Group imports with installed package dependencies first, then external/local file references second. Sort import statements alphabetically by module specifier within each group.

# UI Component Library (`packages/ui`)

- **Built with:** `@sveltejs/package` (`svelte-package`).
- **Components:** shadcn-svelte (backed by bits-ui). See `packages/ui/src/components/` for the full list.
- **Config:** `components.json` at `packages/ui/` root defines aliases and paths.
- **Utility:** `@hyperion/ui/utils` exports the `cn()` helper (`clsx` + `tailwind-merge`).
- **Styling:** Theme CSS (zinc, oklch) in `src/styles/globals.css`. Import via `@hyperion/ui/styles`.
- **Icons:** `@lucide/svelte`.
- **Note:** `tsconfig.json` intentionally does not extend `tsconfig.base.json` — it uses `bundler` module resolution required by Svelte tooling, which conflicts with the root config's `nodenext` resolution.
