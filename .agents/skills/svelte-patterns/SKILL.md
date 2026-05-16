---
name: svelte-patterns
description: Coding rules for Svelte/SvelteKit frontend and the shared UI component library. Use this when working on frontend Svelte/SvelteKit code or UI components.
---

# Svelte/SvelteKit

1.  **Reactivity:** Prefer Svelte 5 runes (`$state`, `$derived`, `$effect`) over legacy store syntax where possible.
2.  **Data Fetching:**
    - Do not use `+page.server.ts` for data loading if the app is purely SPA/static.
    - Fetch data client-side using the typed API client wrappers in each web app's `src/lib/clients.ts`.
3.  **Components:** Keep business logic outside of `.svelte` files; move complex logic to `.ts` utility files.
4.  **Imports:** Group imports with installed package dependencies first, then external/local file references second. Sort import statements alphabetically by module specifier within each group.

## TanStack Query

- Use `createQuery(() => ({ queryKey, queryFn }))` and `createMutation(() => ({ mutationKey, mutationFn }))` with typed Hono clients from `src/lib/clients.ts`.
- Do not typecast `await response.json()` results from Hono typed clients. Destructure `{ data, error, success }`, throw `new Error(error.message)` when `success` is false, then return `data`.
- Exception: endpoints that intentionally return no data/body, such as `204 No Content` heartbeat or liveness checks, may return the typed client response directly from the query function. Do not force those endpoints into the `TApiResponse` JSON envelope just to satisfy this pattern.
- `TApiResponse` branches intentionally expose the inactive side as `null` (`error?: null` on success, `data?: null` on error) to support this destructuring pattern.
- Keep query and mutation keys stable arrays. Add dynamic values to mutation keys as needed, such as record IDs or action variants.

```typescript
const resourceQuery = createQuery(() => ({
    queryKey: ['resource'],
    queryFn: async () => {
        const response = await honoClient.resource.read.$get()
        const { data, error, success } = await response.json()
        if (!success) throw new Error(error.message)
        return data
    },
}))

const updateResourceMutation = createMutation(() => ({
    mutationKey: ['resource', 'update', resourceId],
    mutationFn: async (payload) => {
        const response = await honoClient.resource.update.$post({
            json: payload,
        })
        const { data, error, success } = await response.json()
        if (!success) throw new Error(error.message)
        return data
    },
}))
```

## Fonts

- Load web fonts from each SvelteKit app's `static/fonts/` directory and reference them with root-relative URLs such as `/fonts/inter-variable.woff2`.
- Prefer `.woff2` over `.woff` whenever available.
- If a required font is not already available in `static/fonts/`, download it only from a trusted, reputable source such as the font foundry, Google Fonts, or the official project repository, then commit the font asset and matching `@font-face` CSS.

# UI Component Library (`packages/ui`)

- **Built with:** `@sveltejs/package` (`svelte-package`).
- **Components:** shadcn-svelte (backed by bits-ui). See `packages/ui/src/components/` for the full list.
- **Config:** `components.json` at `packages/ui/` root defines aliases and paths.
- **Utility:** `@PROJECT_NAME/ui/utils` exports the `cn()` helper (`clsx` + `tailwind-merge`).
- **Styling:** Tailwind CSS v4 via `@tailwindcss/vite`, with theme CSS (zinc, oklch) and `tw-animate-css` in `src/styles/globals.css`. Import shared styles via `@PROJECT_NAME/ui/styles`.
- **Icons:** `@lucide/svelte`.
- **Note:** `tsconfig.json` intentionally does not extend `tsconfig.base.json` — it uses `bundler` module resolution required by Svelte tooling, which conflicts with the root config's `nodenext` resolution.
