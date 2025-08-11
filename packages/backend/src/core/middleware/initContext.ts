import { createMiddleware } from 'hono/factory'

import { auth } from '../../auth/index.js'
import { dbClient } from '../../db/pg/client.js'
import * as dbSchema from '../../db/pg/schema.js'

export const initContext = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        ctx.set(
            'auth',
            await auth({
                db: dbClient(ctx.env),
                dbSchema,
                kv: ctx.env.HYPERION_KV,
                env: ctx.env,
            }),
        )
        ctx.set('dbClient', dbClient(ctx.env))
        ctx.set('dbSchema', dbSchema)
        ctx.set('doWssClient', ctx.env.HYPERION_DO_WSS)
        ctx.set('ipAddress', ctx.req.header('cf-connecting-ip') || 'N/A')
        ctx.set('kvClient', ctx.env.HYPERION_KV)
        ctx.set('r2Client', ctx.env.HYPERION_R2)
        ctx.set('session', null)
        ctx.set('user', null)
        ctx.set('userAgent', ctx.req.header('user-agent') || 'N/A')

        await next()
    })
}
