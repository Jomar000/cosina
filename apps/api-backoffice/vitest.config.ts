// Vitest Configuration
// https://vitest.dev/guide/#configuring-vitest

// CloudFlare Workers Vitest Integration
// https://developers.cloudflare.com/workers/testing/vitest-integration

import { cloudflareTest } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

import { prepareTestDatabaseEnvironment } from '../../packages/database/src/postgres/bootstrap.js'

const workerDependencyOptimization = () => ({
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
})

prepareTestDatabaseEnvironment('HYPERIONBOFC_HD')

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
        projects: [
            {
                cacheDir: './node_modules/.vite/vitest-concurrent-test-files',
                extends: true,
                test: {
                    deps: workerDependencyOptimization(),
                    name: 'concurrent-test-files',
                    include: [
                        '**/*.con.test.ts',
                    ],
                },
            },
            {
                cacheDir: './node_modules/.vite/vitest-sequential-test-files',
                extends: true,
                test: {
                    deps: workerDependencyOptimization(),
                    name: 'sequential-test-files',
                    include: [
                        '**/*.seq.test.ts',
                    ],
                    fileParallelism: false,
                },
            },
        ],
        globalSetup: '../../packages/database/src/postgres/bootstrap.ts',
        hookTimeout: 15000,
        setupFiles: ['./vitest.setup.ts'],
        testTimeout: 15000,
    },
})
