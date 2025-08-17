import { Hono } from 'hono'

const internalRouteAuth = new Hono<THonoInstance>()

internalRouteAuth.on(
    [
        'GET',
        'POST',
    ],
    '/*',
    (ctx) => ctx.get('auth').handler(ctx.req.raw),
)

export default internalRouteAuth
