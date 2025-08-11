// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

import type { authSignInOutputSchema } from '@hyperion/validator/internal/auth'
import type { z } from 'zod'

declare global {
    namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface Platform {}
    }

    // Make *.svelte imports recognizable by Typescript
    module '*.svelte'

    // Vite ImageTools Optimized Imports
    // https://github.com/microsoft/TypeScript/issues/38638#issuecomment-1088247956
    module '*&imagetools' {
        const out: string
        export default out
    }

    type TSessionData = z.output<
        (typeof authSignInOutputSchema.def.options)['0']['shape']['data']
    >
}

export {}
