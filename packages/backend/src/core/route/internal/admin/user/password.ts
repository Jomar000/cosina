import { Hono } from 'hono'

export const passwordRoute = new Hono<THonoInstance>()

passwordRoute.post('/override', async (ctx) => {
    // TODO: Password override logic here
    return ctx.json({ data: '' }, 200)
})

export default passwordRoute
