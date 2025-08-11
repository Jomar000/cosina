import { every } from 'hono/combine'
import { createMiddleware } from 'hono/factory'

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
                return ctx.json(
                    {
                        success: false,
                        message: 'You are not allowed to access this resource.',
                    },
                    403,
                )
            }

            await next()
        }),
    )
}
