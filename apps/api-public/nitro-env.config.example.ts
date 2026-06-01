import type { NitroConfig } from 'nitro/types'

type TNitroConfigLayer = Partial<Omit<NitroConfig, 'rootDir'>>
type TRuntimePreset = 'bun' | 'cloudflare' | 'node'
type TNitroEnvConfig = {
    runtimes: Record<TRuntimePreset, TNitroConfigLayer>
    shared: TNitroConfigLayer
}

// Copy this file to nitro-staging.config.ts or nitro-production.config.ts.
// The base nitro.config.ts loads it through NITRO_DEPLOY_ENV and deep-merges it.
// Change this value to match the copied file's deployment environment.
const deployEnvironment = 'development' as const

const requiredRuntimeSecrets = [
    'NITRO_DATABASE_PASSWORD',
    'NITRO_OBJECT_STORAGE_ACCESS_KEY_ID',
    'NITRO_OBJECT_STORAGE_ENDPOINT_URL',
    'NITRO_OBJECT_STORAGE_SECRET_ACCESS_KEY',
    'NITRO_SERVICE_AUTH_BETTER_AUTH_SECRET',
    'NITRO_SERVICE_GOOGLE_CLIENT_ID',
    'NITRO_SERVICE_GOOGLE_CLIENT_SECRET',
    'NITRO_SERVICE_RESEND_API_KEY',
    'NITRO_SERVICE_TURNSTILE_SECRET_KEY',
] as const

const sharedConfig = {
    runtimeConfig: {
        service: {
            environment: deployEnvironment,
            turnstile: {
                bypass: 0,
            },
        },
    },
} satisfies TNitroConfigLayer

const cloudflareConfig = {
    cloudflare: {
        wrangler: {
            env: {
                [deployEnvironment]: {
                    durable_objects: {
                        bindings: [
                            {
                                class_name: '$DurableObject',
                                name: '$DurableObject',
                            },
                        ],
                    },
                    hyperdrive: [
                        {
                            binding: 'HYPERIONPUB_HD',
                            id: '<hyperdrive-id>',
                        },
                    ],
                    kv_namespaces: [
                        {
                            binding: 'HYPERIONPUB_KV',
                            id: '<kv-namespace-id>',
                        },
                    ],
                    limits: {
                        cpu_ms: 5000,
                    },
                    name: `hyperion-api-public-${deployEnvironment}`,
                    observability: {
                        enabled: true,
                    },
                    placement: {
                        mode: 'smart',
                        // mode: 'targeted',
                        // region: 'aws-southeast-ap-1',
                    },
                    preview_urls: false,
                    route: {
                        custom_domain: true,
                        pattern: '<api.example.com>',
                    },
                    secrets: {
                        required: [...requiredRuntimeSecrets],
                    },
                    workers_dev: false,
                },
            },
        },
    },
} satisfies TNitroConfigLayer

const nodeConfig = {
    storage: {
        kv: {
            base: './.nitro/storage/kv',
            driver: 'fs',
        },
    },
} satisfies TNitroConfigLayer

const bunConfig = {
    storage: {
        kv: {
            base: './.nitro/storage/kv',
            driver: 'fs',
        },
    },
} satisfies TNitroConfigLayer

export default {
    shared: sharedConfig,
    runtimes: {
        bun: bunConfig,
        cloudflare: cloudflareConfig,
        node: nodeConfig,
    },
} satisfies TNitroEnvConfig
