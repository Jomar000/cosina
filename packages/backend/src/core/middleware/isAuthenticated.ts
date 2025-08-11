import { createMiddleware } from 'hono/factory'

export const isAuthenticated = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        const authData = await ctx.get('auth').api.getSession({
            headers: ctx.req.raw.headers,
        })

        if (!authData) {
            return ctx.json(
                {
                    success: false,
                    message: 'You are not allowed to access this resource.',
                },
                401,
            )
        }

        ctx.set('session', authData.session)
        ctx.set('user', authData.user)

        await next()
    })
}
