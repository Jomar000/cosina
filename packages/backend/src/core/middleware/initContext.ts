import { S3Client } from '@aws-sdk/client-s3'
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
        ctx.set('r2ClientWorker', ctx.env.HYPERION_R2)
        ctx.set(
            'r2ClientS3Api',
            new S3Client({
                region: ctx.env.CF_R2_REGION,
                endpoint: `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: ctx.env.CF_R2_ACCESS_KEY_ID,
                    secretAccessKey: ctx.env.CF_R2_SECRET_ACCESS_KEY,
                },
            }),
        )
        ctx.set('session', null)
        ctx.set('user', null)
        ctx.set('userAgent', ctx.req.header('user-agent') || 'N/A')

        await next()
    })
}
