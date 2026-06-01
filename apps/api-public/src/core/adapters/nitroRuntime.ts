import { useRuntimeConfig } from 'nitro/runtime-config'
import { useStorage } from 'nitro/storage'
import type { Context } from 'hono'

import type { TAppConfig, THonoInstance } from '../../types.js'
import type {
    TKeyValueStorage,
    TObjectStorageSigner,
    TRequestMetadata,
} from '../contracts.js'
import type { TObjectStorageConfig } from './objectStorage.js'
import { createS3CompatibleObjectStorageSigner } from './objectStorage.js'

const HYPERDRIVE_BINDING = 'HYPERIONPUB_HD'

type THyperdriveBinding = {
    connectionString?: unknown
}

type TCloudflareRuntimeRequest = Request & {
    runtime?: {
        cloudflare?: {
            env?: Record<string, unknown>
        }
    }
}

export const getAppConfig = (): TAppConfig => {
    const { service } = useRuntimeConfig()

    return {
        auth: {
            betterAuthSecret: String(service.auth?.betterAuthSecret ?? ''),
            sessionExpiration: Number(
                service.auth?.sessionExpiration ?? 604800,
            ),
            sessionUpdateAge: Number(service.auth?.sessionUpdateAge ?? 86400),
        },
        cookie: {
            domain: String(service.cookie?.domain ?? 'localhost'),
        },
        cors: {
            allowCredentials: !!Number(service.cors?.allowCredentials ?? 1),
            allowHeaders: String(
                service.cors?.allowHeaders ??
                    'Content-Type,User-Agent,X-CAPTCHA-Response,X-CSRF-Token',
            ),
            allowMethods: String(service.cors?.allowMethods ?? 'GET,POST'),
            exposeHeaders: String(
                service.cors?.exposeHeaders ?? 'Content-Length',
            ),
            maxAge: Number(service.cors?.maxAge ?? 7200),
        },
        environment: String(service.environment ?? 'development'),
        google: {
            clientId: String(service.google?.clientId ?? ''),
            clientSecret: String(service.google?.clientSecret ?? ''),
        },
        mailer: {
            account: String(service.mailer?.account ?? ''),
        },
        resend: {
            apiKey: String(service.resend?.apiKey ?? ''),
        },
        status: String(service.status ?? 'up'),
        turnstile: {
            bypass: !!Number(service.turnstile?.bypass ?? 0),
            secretKey: String(service.turnstile?.secretKey ?? ''),
            siteVerify: String(
                service.turnstile?.siteVerify ??
                    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            ),
            siteVerifyTimeoutMs: Number(
                service.turnstile?.siteVerifyTimeoutMs ?? 5000,
            ),
            tokenMaxLength: Number(service.turnstile?.tokenMaxLength ?? 2048),
        },
        url: {
            backend: String(service.url?.backend ?? 'http://localhost:8081'),
            frontend: String(service.url?.frontend ?? 'http://localhost:5174'),
        },
    }
}

const getHyperdriveConnectionString = (request?: Request) => {
    const env = (request as TCloudflareRuntimeRequest | undefined)?.runtime
        ?.cloudflare?.env
    const binding = env?.[HYPERDRIVE_BINDING] as THyperdriveBinding | undefined

    return typeof binding?.connectionString === 'string' &&
        binding.connectionString !== ''
        ? binding.connectionString
        : null
}

export const getDatabaseConfig = (request?: Request) => {
    const hyperdriveConnectionString = getHyperdriveConnectionString(request)

    if (hyperdriveConnectionString) {
        return hyperdriveConnectionString
    }

    const { database } = useRuntimeConfig()

    return {
        database: String(database.name ?? 'hyperion'),
        host: String(database.host ?? 'localhost'),
        pass: String(database.password ?? ''),
        port: Number(database.port ?? 5432),
        user: String(database.user ?? 'postgres'),
    }
}

export const getKvClient = (): TKeyValueStorage => {
    return useStorage<string>('kv')
}

export const getObjectStorageSigner = (): TObjectStorageSigner => {
    return createS3CompatibleObjectStorageSigner(getObjectStorageConfig())
}

export const getRequestMetadata = (
    ctx: Context<THonoInstance>,
): TRequestMetadata => {
    return {
        correlationId:
            ctx.req.header('cf-ray') ?? ctx.req.header('x-request-id') ?? null,
        ipAddress: ctx.req.header('cf-connecting-ip') || 'N/A',
        userAgent: ctx.req.header('user-agent') || 'N/A',
    }
}

const readRequiredNitroConfigValue = (
    value: number | string | undefined,
    path: string,
) => {
    if (value === undefined || value === '') {
        throw new Error(`Missing Nitro runtime config: ${path}`)
    }

    return String(value)
}

export const getObjectStorageConfig = (): TObjectStorageConfig => {
    const { objectStorage } = useRuntimeConfig()

    return {
        accessKeyId: readRequiredNitroConfigValue(
            objectStorage.accessKeyId,
            'objectStorage.accessKeyId',
        ),
        endpointUrl: readRequiredNitroConfigValue(
            objectStorage.endpointUrl,
            'objectStorage.endpointUrl',
        ),
        presignExpiry: readRequiredNitroConfigValue(
            objectStorage.presignExpiry,
            'objectStorage.presignExpiry',
        ),
        privateBucket: readRequiredNitroConfigValue(
            objectStorage.privateBucket,
            'objectStorage.privateBucket',
        ),
        publicBaseUrl: readRequiredNitroConfigValue(
            objectStorage.publicBaseUrl,
            'objectStorage.publicBaseUrl',
        ),
        publicBucket: readRequiredNitroConfigValue(
            objectStorage.publicBucket,
            'objectStorage.publicBucket',
        ),
        secretAccessKey: readRequiredNitroConfigValue(
            objectStorage.secretAccessKey,
            'objectStorage.secretAccessKey',
        ),
    }
}
