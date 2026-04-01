// Vitest Configuration
// https://vitest.dev/guide/#configuring-vitest

// CloudFlare Workers Vitest Integration
// https://developers.cloudflare.com/workers/testing/vitest-integration

import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [
        cloudflareTest({
            wrangler: {
                configPath: './wrangler.toml',
                environment: 'test',
            },
        }),
    ],
    test: {
        coverage: {
            provider: 'istanbul',
        },
        deps: {
            // Workerd only runs ESM — CJS dependencies must be pre-bundled via Vite's
            // SSR optimizer so they are converted to ESM before workerd loads them.
            // resend → svix (pure CJS) → uuid
            // https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/#module-resolution
            optimizer: {
                ssr: {
                    enabled: true,
                    include: [
                        'resend',
                    ],
                },
            },
        },
        setupFiles: ['./vitest.setup.ts'],
        testTimeout: 10000,
    },
})
