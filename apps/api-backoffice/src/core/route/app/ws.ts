import { Hono } from 'hono'

import { apiResponseErrorWrapper } from '../../../utilities.js'
import { isAuthenticated } from '../../middleware/isAuthenticated.js'

export const wsRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(isAuthenticated())
    /**
     * @description
     * Routes
     */
    .get('/:channel', async (ctx) => {
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

        const authHeaders = ctx.req.raw.headers

        const [
            { success: canListen },
            { success: canBroadcast },
        ] = await Promise.all([
            ctx.get('auth').api.hasPermission({
                headers: authHeaders,
                body: { permissions: { ws: ['listen'] } },
            }),
            ctx.get('auth').api.hasPermission({
                headers: authHeaders,
                body: { permissions: { ws: ['broadcast'] } },
            }),
        ])

        if (!canListen) {
            return apiResponseErrorWrapper(ctx, {
                code: 'FORBIDDEN',
                message: 'You are not allowed to access this resource.',
                status: 403,
            })
        }

        const headers = new Headers(authHeaders)
        headers.set('X-WS-Can-Broadcast', canBroadcast ? 'true' : 'false')

        // README: WebSocket logic is implemented in src/app/durableObject/webSocketServer.ts
        const id = ctx.get('doWssClient').idFromName(channel)
        const stub = ctx.get('doWssClient').get(id)

        return stub.fetch(new Request(ctx.req.raw, { headers }))
    })

export default wsRoute
export type WsRouteType = typeof wsRoute
