// Vitest Configuration
// https://vitest.dev/guide/#configuring-vitest

// CloudFlare Workers Vitest Integration
// https://developers.cloudflare.com/workers/testing/vitest-integration

// NOTE
// @cloudflare/vitest-pool-workers does not run on Vitest 4 as of this writing
// https://github.com/cloudflare/workers-sdk/issues/11064

import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'

export default defineWorkersConfig({
    test: {
        poolOptions: {
            workers: {
                wrangler: {
                    configPath: './wrangler.toml',
                    environment: 'test',
                },
            },
        },
    },
})
