import { createMiddleware } from 'hono/factory'

import { AppError } from '../../errors.js'
import type { THonoInstance } from '../../types.js'

export const requestTimer = createMiddleware<THonoInstance>(
    async (ctx, next) => {
        const start = Date.now()
        let thrownStatus: number | undefined

        try {
            await next()
        } catch (err) {
            thrownStatus = err instanceof AppError ? err.status : 500
            throw err
        } finally {
            console.log(
                JSON.stringify({
                    type: 'REQUEST',
                    requestId: ctx.get('requestId'),
                    correlationId: ctx.get('correlationId') ?? 'N/A',
                    method: ctx.req.method,
                    path: new URL(ctx.req.url).pathname,
                    status: thrownStatus ?? ctx.res.status,
                    durationMs: Date.now() - start,
                    environment: ctx.env.ENVIRONMENT,
                }),
            )
        }
    },
)
