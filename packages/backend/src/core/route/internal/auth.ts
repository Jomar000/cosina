import { Hono } from 'hono'

export const authRoute = new Hono<THonoInstance>()

authRoute.on(
    [
        'GET',
        'POST',
    ],
    '/*',
    (ctx) => ctx.get('auth').handler(ctx.req.raw),
)

export default authRoute
