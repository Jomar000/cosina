import type { AwsClient } from 'aws4fetch'

import type { auth } from './auth/index.js'
import type { dbClient } from './db/pg/client.js'
import type * as dbSchema from './db/pg/schema.js'

declare global {
    type THonoBindings = {
        HYPERION_DO_WSS: DurableObjectNamespace<WebSocketServer>
        HYPERION_HD: Hyperdrive
        HYPERION_KV: KVNamespace
        HYPERION_R2: R2Bucket
    } & Record<string, string>

    type THonoVariables = {
        auth: Awaited<ReturnType<typeof auth>>
        aws4FetchClient: AwsClient
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

export {}
