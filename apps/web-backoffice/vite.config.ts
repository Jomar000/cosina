// Vite Configuration
// https://vitejs.dev/config/#configuring-vite

import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { imagetools } from 'vite-imagetools'
import { defineConfig } from 'vitest/config'

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
    ],
    test: {
        expect: { requireAssertions: true },
        projects: [
            {
                extends: './vite.config.ts',
                test: {
                    name: 'client',
                    browser: {
                        enabled: true,
                        provider: playwright(),
                        instances: [{ browser: 'chromium' }],
                    },
                    include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
                    exclude: ['src/lib/server/**'],
                    setupFiles: ['./vitest-setup-client.ts'],
                },
            },
            {
                extends: './vite.config.ts',
                test: {
                    name: 'server',
                    environment: 'node',
                    include: ['src/**/*.{test,spec}.{js,ts}'],
                    exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
                },
            },
        ],
    },
})
