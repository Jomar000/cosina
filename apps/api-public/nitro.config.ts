import { defineConfig } from 'nitro'
import type { NitroConfig } from 'nitro/types'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

type TNitroConfig = Omit<NitroConfig, 'rootDir'>
type TNitroConfigLayer = Partial<TNitroConfig>
type TDeployEnv = 'development' | 'production' | 'staging' | 'test'
type TRuntimePreset = 'bun' | 'cloudflare' | 'node'
type TLayeredNitroEnvConfig = {
    runtimes?: Partial<Record<TRuntimePreset, TNitroConfigLayer>>
    shared?: TNitroConfigLayer
}
type TNitroEnvConfig = TNitroConfigLayer | TLayeredNitroEnvConfig

const deployEnv = (process.env.NITRO_DEPLOY_ENV ?? 'development') as TDeployEnv
const runtimePreset = (process.env.NITRO_RUNTIME_PRESET ??
    'cloudflare') as TRuntimePreset

const allowedDeployEnvs = new Set<TDeployEnv>([
    'development',
    'production',
    'staging',
    'test',
])
const allowedRuntimePresets = new Set<TRuntimePreset>([
    'bun',
    'cloudflare',
    'node',
])

if (!allowedDeployEnvs.has(deployEnv)) {
    throw new Error(`Unsupported NITRO_DEPLOY_ENV: ${deployEnv}`)
}

if (!allowedRuntimePresets.has(runtimePreset)) {
    throw new Error(`Unsupported NITRO_RUNTIME_PRESET: ${runtimePreset}`)
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const isLayeredEnvConfig = (
    value: TNitroEnvConfig,
): value is TLayeredNitroEnvConfig => {
    return isPlainObject(value) && ('runtimes' in value || 'shared' in value)
}

const mergeNitroConfig = <T extends Record<string, unknown>>(
    base: T,
    overlay: Record<string, unknown>,
): T => {
    const result: Record<string, unknown> = { ...base }

    for (const [
        key,
        value,
    ] of Object.entries(overlay)) {
        const existing = result[key]

        result[key] =
            isPlainObject(existing) && isPlainObject(value)
                ? mergeNitroConfig(existing, value)
                : value
    }

    return result as T
}

const loadDeployEnvConfig = async (): Promise<TNitroConfigLayer> => {
    if (deployEnv === 'development') {
        return {}
    }

    const configUrl = new URL(`./nitro-${deployEnv}.config.ts`, import.meta.url)
    const configPath = fileURLToPath(configUrl)

    if (!existsSync(configPath)) {
        throw new Error(
            `Missing Nitro deploy config: nitro-${deployEnv}.config.ts`,
        )
    }

    const configModule = (await import(configUrl.href)) as {
        default?: TNitroEnvConfig
    }

    const config = configModule.default ?? {}

    if (!isLayeredEnvConfig(config)) {
        return config
    }

    return mergeNitroConfig(
        (config.shared ?? {}) as Record<string, unknown>,
        (config.runtimes?.[runtimePreset] ?? {}) as Record<string, unknown>,
    ) as TNitroConfigLayer
}

const envConfig = await loadDeployEnvConfig()

const baseConfig = {
    cloudflare: {
        deployConfig: true,
        nodeCompat: true,
        wrangler: {
            dev: {
                port: 8081,
            },
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
                    id: '00000000000000000000000000000000',
                    localConnectionString:
                        'postgres://postgres:12345678@localhost:5432/hyperion',
                },
            ],
            kv_namespaces: [
                {
                    binding: 'HYPERIONPUB_KV',
                    id: '00000000000000000000000000000000',
                },
            ],
            limits: {
                cpu_ms: 5000,
            },
            migrations: [
                {
                    new_sqlite_classes: ['$DurableObject'],
                    tag: 'v1',
                },
            ],
            name: 'hyperion-api-public',
            observability: {
                enabled: true,
            },
            placement: {
                mode: 'smart',
                // mode: 'targeted',
                // region: 'aws-southeast-ap-1'
            },
            secrets: {
                required: [
                    'NITRO_DATABASE_PASSWORD',
                    'NITRO_OBJECT_STORAGE_ACCESS_KEY_ID',
                    'NITRO_OBJECT_STORAGE_ENDPOINT_URL',
                    'NITRO_OBJECT_STORAGE_SECRET_ACCESS_KEY',
                    'NITRO_SERVICE_AUTH_BETTER_AUTH_SECRET',
                    'NITRO_SERVICE_GOOGLE_CLIENT_ID',
                    'NITRO_SERVICE_GOOGLE_CLIENT_SECRET',
                    'NITRO_SERVICE_RESEND_API_KEY',
                    'NITRO_SERVICE_TURNSTILE_SECRET_KEY',
                ],
            },
        },
    },
    compatibilityDate: '2026-05-24',
    features: {
        websocket: true,
    },
    preset: 'cloudflare_durable',
    routes: {
        '/api/ws/**': {
            handler: './src/core/nitro/ws.ts',
        },
    },
    runtimeConfig: {
        database: {
            host: 'localhost',
            name: 'hyperion',
            password: '',
            port: 5432,
            user: 'postgres',
        },
        nitro: {
            envPrefix: 'NITRO_',
        },
        objectStorage: {
            accessKeyId: '',
            endpointUrl: '',
            presignExpiry: 600,
            privateBucket: '',
            publicBaseUrl: '',
            publicBucket: '',
            secretAccessKey: '',
        },
        service: {
            auth: {
                betterAuthSecret: '',
                sessionExpiration: 604800,
                sessionUpdateAge: 86400,
            },
            cookie: {
                domain: 'localhost',
            },
            cors: {
                allowCredentials: 1,
                allowHeaders:
                    'Content-Type,User-Agent,X-CAPTCHA-Response,X-CSRF-Token',
                allowMethods: 'GET,POST',
                exposeHeaders: 'Content-Length',
                maxAge: 7200,
            },
            environment: 'development',
            google: {
                clientId: '',
                clientSecret: '',
            },
            mailer: {
                account: '',
            },
            resend: {
                apiKey: '',
            },
            status: 'up',
            turnstile: {
                bypass: 0,
                secretKey: '',
                siteVerify:
                    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
                siteVerifyTimeoutMs: 5000,
                tokenMaxLength: 2048,
            },
            url: {
                backend: 'http://localhost:8081',
                frontend: 'http://localhost:5174',
            },
        },
    },
    serverEntry: './server.ts',
    storage: {
        kv: {
            binding: 'HYPERIONPUB_KV',
            driver: 'cloudflare-kv-binding',
        },
    },
    typescript: {
        generatedTypesDir: './.nitro/types',
        generateRuntimeConfigTypes: true,
        generateTsConfig: true,
    },
} satisfies TNitroConfigLayer

const runtimePresetConfig = {
    bun: {
        storage: {
            kv: {
                base: './.nitro/storage/kv',
                driver: 'fs',
            },
        },
    },
    cloudflare: {},
    node: {
        storage: {
            kv: {
                base: './.nitro/storage/kv',
                driver: 'fs',
            },
        },
    },
} satisfies Record<TRuntimePreset, TNitroConfigLayer>

export default defineConfig(
    mergeNitroConfig(
        mergeNitroConfig(
            baseConfig as Record<string, unknown>,
            runtimePresetConfig[runtimePreset] as Record<string, unknown>,
        ),
        envConfig as Record<string, unknown>,
    ) as TNitroConfig,
)
