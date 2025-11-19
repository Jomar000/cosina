import { Hono } from 'hono'

export const wsRoute = new Hono<THonoInstance>()

wsRoute.get('/:channel', async (ctx) => {
    const authData = await ctx.get('auth').api.getSession({
        headers: ctx.req.raw.headers,
    })

    if (!authData) {
        return ctx.text('You are not allowed to access this resource.', 401)
    }

    const channel = ctx.req.param('channel')

    if (channel.length < 1 || channel.length > 32) {
        return ctx.text(
            'Invalid channel name. Minimum of 1 and a maximum of 32 character(s).',
            400,
        )
    }

    const upgradeHeader = ctx.req.header('Upgrade')

    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return ctx.text('Expected Upgrade: websocket', 426)
    }

    // README: WebSocket logic is implemented in src/app/durableObject/webSocketServer.ts
    const id = ctx.get('doWssClient').idFromName(channel)
    const stub = ctx.get('doWssClient').get(id)

    return stub.fetch(ctx.req.raw)
})

export default wsRoute
