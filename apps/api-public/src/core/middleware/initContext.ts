import { dbClient, dbSchema } from '@hyperion/database/postgres'
import { AwsClient } from 'aws4fetch'
import { createMiddleware } from 'hono/factory'

import { aclBuilder } from '../../auth/acl.js'
import { auth } from '../../auth/index.js'

export const initContext = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        const initDbClient = dbClient({
            host: ctx.env.HYPERIONPUB_HD.host,
            port: ctx.env.HYPERIONPUB_HD.port,
            database: ctx.env.HYPERIONPUB_HD.database,
            user: ctx.env.HYPERIONPUB_HD.user,
            pass: ctx.env.HYPERIONPUB_HD.password,
        })

        try {
            const acl = await aclBuilder(
                initDbClient,
                dbSchema,
                ctx.env.HYPERIONPUB_KV,
            )
            ctx.set('acl', acl)
            ctx.set(
                'auth',
                await auth({
                    db: initDbClient,
                    dbSchema,
                    kv: ctx.env.HYPERIONPUB_KV,
                    env: ctx.env,
                    acl,
                }),
            )
            ctx.set(
                'aws4FetchClient',
                new AwsClient({
                    accessKeyId: ctx.env.CF_R2_ACCESS_KEY_ID,
                    secretAccessKey: ctx.env.CF_R2_SECRET_ACCESS_KEY,
                }),
            )
            ctx.set(
                'correlationId',
                ctx.req.header('cf-ray') ??
                    ctx.req.header('x-request-id') ??
                    null,
            )
            ctx.set('dbClient', initDbClient)
            ctx.set('dbSchema', dbSchema)
            ctx.set('doWssClient', ctx.env.HYPERIONPUB_DO_WSS)
            ctx.set('ipAddress', ctx.req.header('cf-connecting-ip') || 'N/A')
            ctx.set('isPrivilegedRole', false)
            ctx.set('kvClient', ctx.env.HYPERIONPUB_KV)
            ctx.set('r2Client', ctx.env.HYPERIONPUB_R2)
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
