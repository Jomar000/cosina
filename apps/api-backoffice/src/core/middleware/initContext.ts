import { dbClient, dbSchema } from '@hyperion/database/postgres'
import { createMiddleware } from 'hono/factory'

import { aclBuilder } from '../../auth/acl.js'
import { auth } from '../../auth/index.js'
import type { THonoInstance } from '../../types.js'
import {
    getDatabaseConfig,
    getKvClient,
    getRequestMetadata,
} from '../adapters/nitroRuntime.js'

export const initContext = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        const appConfig = ctx.get('appConfig')
        const requestMetadata = getRequestMetadata(ctx)
        const kvClient = getKvClient()

        const initDbClient = dbClient(getDatabaseConfig(ctx.req.raw))

        try {
            const initAcl = await aclBuilder(initDbClient, dbSchema, kvClient)

            ctx.set('acl', initAcl)
            ctx.set(
                'auth',
                await auth({
                    db: initDbClient,
                    dbSchema,
                    kv: kvClient,
                    appConfig,
                    acl: initAcl,
                }),
            )
            ctx.set('appConfig', appConfig)
            ctx.set('correlationId', requestMetadata.correlationId)
            ctx.set('dbClient', initDbClient)
            ctx.set('dbSchema', dbSchema)
            ctx.set('ipAddress', requestMetadata.ipAddress)
            ctx.set('isPrivilegedRole', false)
            ctx.set('kvClient', kvClient)
            ctx.set('role', 'N/A')
            ctx.set('session', null)
            ctx.set('user', null)
            ctx.set('userAgent', requestMetadata.userAgent)

            await next()
        } finally {
            // Always release the DB connection after the request completes to
            // prevent connection exhaustion across multiple requests (e.g. tests).
            await initDbClient.$client.end()
        }
    })
}
