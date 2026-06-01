import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        coverage: {
            provider: 'istanbul',
        },
        environment: 'node',
        projects: [
            {
                extends: true,
                test: {
                    name: 'concurrent-test-files',
                    include: [
                        '**/*.con.test.ts',
                    ],
                },
            },
            {
                extends: true,
                test: {
                    name: 'sequential-test-files',
                    include: [
                        '**/*.seq.test.ts',
                    ],
                    fileParallelism: false,
                },
            },
        ],
        setupFiles: ['./vitest.setup.ts'],
        testTimeout: 10000,
    },
})
