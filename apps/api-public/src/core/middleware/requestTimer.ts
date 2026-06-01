import { createMiddleware } from 'hono/factory'

import type { THonoInstance } from '../../types.js'

export const requestTimer = createMiddleware<THonoInstance>(
    async (ctx, next) => {
        const start = Date.now()

        await next()

        console.log(
            JSON.stringify({
                type: 'REQUEST',
                requestId: ctx.get('requestId'),
                correlationId: ctx.get('correlationId') ?? 'N/A',
                method: ctx.req.method,
                path: new URL(ctx.req.url).pathname,
                status: ctx.res.status,
                durationMs: Date.now() - start,
                environment: ctx.env.ENVIRONMENT,
            }),
        )
    },
)
