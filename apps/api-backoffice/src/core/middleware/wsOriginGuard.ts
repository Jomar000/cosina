import { createMiddleware } from 'hono/factory'

import type { THonoInstance } from '../../types.js'
import { apiResponseErrorWrapper } from '../../utilities/helpers.js'

export const wsOriginGuard = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        const origin = ctx.req.header('origin')

        if (!origin) {
            return apiResponseErrorWrapper(ctx, {
                code: 'BAD_REQUEST',
                message: 'Missing Origin request header.',
            })
        }

        if (ctx.env.URL_FRONTEND !== origin) {
            return apiResponseErrorWrapper(ctx, {
                code: 'FORBIDDEN',
                message: 'Invalid request origin.',
                status: 403,
            })
        }

        await next()
    })
}
