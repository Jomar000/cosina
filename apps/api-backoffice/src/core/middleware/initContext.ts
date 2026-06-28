import { dbClient, dbSchema } from '@cosina/database/postgres'
import { AwsClient } from 'aws4fetch'
import { createMiddleware } from 'hono/factory'

import { aclBuilder } from '../../auth/acl.js'
import { auth } from '../../auth/index.js'
import type { THonoInstance } from '../../types.js'

export const initRequestContext = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        ctx.set(
            'correlationId',
            ctx.req.header('cf-ray') ?? ctx.req.header('x-request-id') ?? null,
        )
        ctx.set('doWssClient', ctx.env.COSINABOFC_DO_WSS)
        ctx.set('ipAddress', ctx.req.header('cf-connecting-ip') || 'N/A')
        ctx.set('isPrivilegedRole', false)
        ctx.set('kvClient', ctx.env.COSINABOFC_KV)
        ctx.set('role', 'N/A')
        ctx.set('session', null)
        ctx.set('user', null)
        ctx.set('userAgent', ctx.req.header('user-agent') || 'N/A')

        await next()
    })
}

export const initDatabaseContext = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        const initDbClient = dbClient({
            host: ctx.env.COSINABOFC_HD.host,
            port: ctx.env.COSINABOFC_HD.port,
            database: ctx.env.COSINABOFC_HD.database,
            user: ctx.env.COSINABOFC_HD.user,
            pass: ctx.env.COSINABOFC_HD.password,
        })

        ctx.set('dbClient', initDbClient)
        ctx.set('dbSchema', dbSchema)

        try {
            await next()
        } finally {
            // Always release the DB connection after the request completes to
            // prevent connection exhaustion across multiple requests (e.g. tests).
            await initDbClient.$client.end()
        }
    })
}

export const initAuthContext = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        const initAcl = await aclBuilder(
            ctx.get('dbClient'),
            dbSchema,
            ctx.get('kvClient'),
        )

        ctx.set('acl', initAcl)
        ctx.set(
            'auth',
            await auth({
                db: ctx.get('dbClient'),
                dbSchema,
                kv: ctx.get('kvClient'),
                env: ctx.env,
                acl: initAcl,
            }),
        )

        await next()
    })
}

export const initObjectStorageContext = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        ctx.set(
            'aws4FetchClient',
            new AwsClient({
                accessKeyId: ctx.env.CF_R2_ACCESS_KEY_ID,
                secretAccessKey: ctx.env.CF_R2_SECRET_ACCESS_KEY,
            }),
        )

        await next()
    })
}

export const initContext = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        await initRequestContext()(ctx, async () => {
            await initDatabaseContext()(ctx, async () => {
                await initAuthContext()(ctx, async () => {
                    await initObjectStorageContext()(ctx, next)
                })
            })
        })
    })
}
