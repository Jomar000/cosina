import { useStorage } from 'nitro/storage'

export const testRuntimeConfig = {
    service: {
        auth: {
            betterAuthSecret: 'better-auth-secret-12345678901234567890',
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
        environment: 'test',
        google: {
            clientId: '',
            clientSecret: '',
        },
        mailer: {
            account: 'no-reply@example.test',
        },
        resend: {
            apiKey: 're_test',
        },
        status: 'up',
        turnstile: {
            bypass: 0,
            secretKey: 'turnstile-secret',
            siteVerify:
                'https://challenges.cloudflare.com/turnstile/v0/siteverify',
            siteVerifyTimeoutMs: 5000,
            tokenMaxLength: 2048,
        },
        url: {
            backend: 'http://localhost:8080',
            frontend: 'http://localhost:5175',
        },
    },
    database: {
        host: 'localhost',
        name: 'hyperion_test',
        password: '12345678',
        port: 5432,
        user: 'postgres',
    },
    objectStorage: {
        accessKeyId: 'test-access-key',
        endpointUrl: 'https://object-storage.example.test',
        presignExpiry: 600,
        privateBucket: 'hyperion-private',
        publicBaseUrl: 'https://assets.example.test',
        publicBucket: 'hyperion-public',
        secretAccessKey: 'test-secret-key',
    },
} as const

export const testDatabaseConfig = {
    database: testRuntimeConfig.database.name,
    host: testRuntimeConfig.database.host,
    pass: testRuntimeConfig.database.password,
    port: testRuntimeConfig.database.port,
    user: testRuntimeConfig.database.user,
}

type TTestKvNamespace = {
    delete(key: string): Promise<void>
    get(key: string): Promise<null | string>
    list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>
    put(
        key: string,
        value: string,
        options?: { expirationTtl?: number },
    ): Promise<void>
}

const storage = () => useStorage<string>('kv')

export const testKvNamespace: TTestKvNamespace = {
    delete: async (key) => {
        await storage().removeItem(key)
    },
    get: async (key) => {
        const value = await storage().getItem(key)

        if (value === null || typeof value === 'string') {
            return value
        }

        return JSON.stringify(value)
    },
    list: async (options) => {
        const keys = await storage().getKeys(options?.prefix)

        return {
            keys: keys.map((name) => ({ name })),
        }
    },
    put: async (key, value, options) => {
        await storage().setItem(
            key,
            value,
            options?.expirationTtl ? { ttl: options.expirationTtl } : undefined,
        )
    },
}
