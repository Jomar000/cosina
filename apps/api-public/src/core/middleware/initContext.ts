import { dbClient, dbSchema } from '@hyperion/database/postgres'
import { AwsClient } from 'aws4fetch'
import { createMiddleware } from 'hono/factory'

import { auth } from '../../auth/index.js'

export const initContext = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        const initDbClient = dbClient({
            host: ctx.env.HYPERION_HD.host,
            port: ctx.env.HYPERION_HD.port,
            database: ctx.env.HYPERION_HD.database,
            user: ctx.env.HYPERION_HD.user,
            pass: ctx.env.HYPERION_HD.password,
        })

        try {
            ctx.set(
                'auth',
                await auth({
                    db: initDbClient,
                    dbSchema,
                    kv: ctx.env.HYPERION_KV,
                    env: ctx.env,
                }),
            )
            ctx.set(
                'aws4FetchClient',
                new AwsClient({
                    accessKeyId: ctx.env.CF_R2_ACCESS_KEY_ID,
                    secretAccessKey: ctx.env.CF_R2_SECRET_ACCESS_KEY,
                }),
            )
            ctx.set('dbClient', initDbClient)
            ctx.set('dbSchema', dbSchema)
            ctx.set('doWssClient', ctx.env.HYPERION_DO_WSS)
            ctx.set('ipAddress', ctx.req.header('cf-connecting-ip') || 'N/A')
            ctx.set('isPrivilegedRole', false)
            ctx.set('kvClient', ctx.env.HYPERION_KV)
            ctx.set('r2Client', ctx.env.HYPERION_R2)
            ctx.set('role', 'N/A')
            ctx.set('session', null)
            ctx.set('user', null)
            ctx.set('userAgent', ctx.req.header('user-agent') || 'N/A')

            await next()
        } finally {
            // Always release the DB connection after the request completes to
            // prevent connection exhaustion across multiple requests (e.g. tests).
            await initDbClient.$client.end()
        }
    })
}
