// Vite Configuration
// https://vitejs.dev/config/#configuring-vite

import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { svelteTesting } from '@testing-library/svelte/vite'
import { defineConfig } from 'vite'
import { imagetools } from 'vite-imagetools'

export default defineConfig({
    build: {
        target: 'esnext',
    },
    plugins: [
        tailwindcss(),
        sveltekit(),
        imagetools({
            defaultDirectives: () => {
                return new URLSearchParams({
                    format: 'avif',
                })
            },
        }),
        svelteTesting(),
    ],
    test: {
        environment: 'happy-dom',
        globals: true,
    },
})
