import { every } from 'hono/combine'
import { createMiddleware } from 'hono/factory'

import type { THonoInstance } from '../../types.js'
import { apiResponseErrorWrapper } from '../../utilities.js'
import { isAuthenticated } from './isAuthenticated.js'

export const isAuthorized = (permissions: Record<string, string[]>) => {
    return every(
        isAuthenticated(),
        createMiddleware<THonoInstance>(async (ctx, next) => {
            const { success } = await ctx.get('auth').api.hasPermission({
                headers: ctx.req.raw.headers,
                body: {
                    permissions,
                },
            })

            if (!success) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'FORBIDDEN',
                    message: 'You are not allowed to access this resource.',
                    status: 403,
                })
            }

            await next()
        }),
    )
}
