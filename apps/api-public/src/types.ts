import type { dbClient, dbSchema } from '@cosina/database/postgres'
import type {
    TBaseHonoBindings,
    TBaseHonoInstance,
    TBaseHonoVariables,
    TApiResponseError,
} from '@cosina/types/shared'
import type { AwsClient } from 'aws4fetch'
import type {
    ClientErrorStatusCode,
    ServerErrorStatusCode,
} from 'hono/utils/http-status'

import type { aclBuilder } from './auth/acl.js'
import type { auth } from './auth/index.js'
import type { WebSocketServer } from './core/durableObject/webSocketServer.js'

export type THonoBindings = TBaseHonoBindings<
    {
        COSINAPUB_DO_WSS: DurableObjectNamespace<WebSocketServer>
        COSINAPUB_HD: Hyperdrive
        COSINAPUB_KV: KVNamespace
    } & Env
>

export type THonoVariables = TBaseHonoVariables<{
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
    role: string
    session:
        | Awaited<ReturnType<typeof auth>>['$Infer']['Session']['session']
        | null
    user: Awaited<ReturnType<typeof auth>>['$Infer']['Session']['user'] | null
    userAgent: string
}>

export type THonoInstance = TBaseHonoInstance<THonoBindings, THonoVariables>

export type TGlobalApiResponses = {
    [status in ClientErrorStatusCode | ServerErrorStatusCode]: {
        json: TApiResponseError
    }
}
