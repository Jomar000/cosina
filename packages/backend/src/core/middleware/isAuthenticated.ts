import { createMiddleware } from 'hono/factory'

export const isAuthenticated = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        const authData = await ctx.get('auth').api.getSession({
            headers: ctx.req.raw.headers,
        })

        if (!authData) {
            return ctx.json(
                {
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'You are not allowed to access this resource.',
                    },
                },
                401,
            )
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
