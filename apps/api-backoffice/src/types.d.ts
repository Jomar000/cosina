import type { dbClient, dbSchema } from '@hyperion/database/postgres'
import type { AwsClient } from 'aws4fetch'

import type { aclBuilder } from './auth/acl.js'
import type { auth } from './auth/index.js'

declare global {
    type THonoBindings = {
        HYPERIONBOFC_DO_WSS: DurableObjectNamespace<WebSocketServer>
        HYPERIONBOFC_HD: Hyperdrive
        HYPERIONBOFC_KV: KVNamespace
    } & Env

    type THonoVariables = {
        acl: Awaited<ReturnType<typeof aclBuilder>>
        auth: Awaited<ReturnType<typeof auth>>
        aws4FetchClient: AwsClient
        correlationId: string | null
        dbClient: ReturnType<typeof dbClient>
        dbSchema: typeof dbSchema
        doWssClient: DurableObjectNamespace<WebSocketServer>
        ipAddress: string
        isPrivilegedRole: boolean
        kvClient: KVNamespace
        r2Client: R2Bucket
        role: string
        session:
            | Awaited<ReturnType<typeof auth>>['$Infer']['Session']['session']
            | null
        user:
            | Awaited<ReturnType<typeof auth>>['$Infer']['Session']['user']
            | null
        userAgent: string
    }

    type THonoInstance = {
        // Environment Variables [ctx.env]
        Bindings: THonoBindings
        // Context [ctx.get() & ctx.set()]
        Variables: THonoVariables
    }
}

declare module 'cloudflare:test' {
    /* eslint-disable @typescript-eslint/no-empty-object-type */
    // ProvidedEnv controls the type of `import("cloudflare:test").env`
    interface ProvidedEnv extends Env {}
}

export {}
