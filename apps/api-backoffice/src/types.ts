import type { dbClient, dbSchema } from '@hyperion/database/postgres'
import type { TApiResponseError } from '@hyperion/types/shared'
import type {
    ClientErrorStatusCode,
    ServerErrorStatusCode,
} from 'hono/utils/http-status'

import type { aclBuilder } from './auth/acl.js'
import type { auth } from './auth/index.js'
import type {
    TKeyValueStorage,
    TObjectStorageSigner,
} from './core/contracts.js'

export type TAppConfig = {
    auth: {
        betterAuthSecret: string
        sessionExpiration: number
        sessionUpdateAge: number
    }
    cookie: {
        domain: string
    }
    cors: {
        allowCredentials: boolean
        allowHeaders: string
        allowMethods: string
        exposeHeaders: string
        maxAge: number
    }
    environment: string
    google: {
        clientId: string
        clientSecret: string
    }
    mailer: {
        account: string
    }
    resend: {
        apiKey: string
    }
    status: string
    turnstile: {
        bypass: boolean
        secretKey: string
        siteVerify: string
        siteVerifyTimeoutMs: number
        tokenMaxLength: number
    }
    url: {
        backend: string
        frontend: string
    }
}

export type THonoVariables = {
    acl: Awaited<ReturnType<typeof aclBuilder>>
    appConfig: TAppConfig
    auth: Awaited<ReturnType<typeof auth>>
    correlationId: string | null
    dbClient: ReturnType<typeof dbClient>
    dbSchema: typeof dbSchema
    ipAddress: string
    isPrivilegedRole: boolean
    kvClient: TKeyValueStorage
    objectStorageSigner: TObjectStorageSigner
    role: string
    session:
        | Awaited<ReturnType<typeof auth>>['$Infer']['Session']['session']
        | null
    user: Awaited<ReturnType<typeof auth>>['$Infer']['Session']['user'] | null
    userAgent: string
}

export type THonoInstance = {
    Variables: THonoVariables
}

export type TGlobalApiResponses = {
    [status in ClientErrorStatusCode | ServerErrorStatusCode]: {
        json: TApiResponseError
    }
}
