import { createMiddleware } from 'hono/factory'

import { apiResponseErrorWrapper } from '../../utilities.js'

export const isAuthenticated = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        const authData = await ctx.get('auth').api.getSession({
            headers: ctx.req.raw.headers,
        })

        if (!authData) {
            return apiResponseErrorWrapper(ctx, {
                code: 'UNAUTHORIZED',
                message: 'You are not allowed to access this resource.',
                status: 401,
            })
        }

        const { role } = await ctx.get('auth').api.getActiveMemberRole({
            headers: ctx.req.raw.headers,
        })

        ctx.set(
            'isPrivilegedRole',
            [
                'admin',
                'owner',
            ].includes(role),
        )
        ctx.set('role', role)
        ctx.set('session', authData.session)
        ctx.set('user', authData.user)

        await next()
    })
}
