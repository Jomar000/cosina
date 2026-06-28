import type { MiddlewareHandler } from 'hono'
import { Hono } from 'hono'
import { createMiddleware } from 'hono/factory'

import type { THonoInstance } from '../../../types.js'
import { apiResponseErrorWrapper } from '../../../utilities/helpers.js'

// Public WS channels are unauthenticated — customers browse products and track
// orders without signing in. canBroadcast falls back to false for guests.
const publicAccess = createMiddleware<THonoInstance>(async (ctx, next) => {
    await next()
})

const createWsChannel = (
    channel: string,
    authMiddleware: MiddlewareHandler<THonoInstance>,
) => {
    return new Hono<THonoInstance>().get('/', authMiddleware, async (ctx) => {
        const upgradeHeader = ctx.req.header('Upgrade')

        if (!upgradeHeader || upgradeHeader !== 'websocket') {
            return apiResponseErrorWrapper(ctx, {
                code: 'WEBSOCKET_UPGRADE_REQUIRED',
                message: 'Expected Upgrade: websocket',
                status: 426,
            })
        }

        const authHeaders = ctx.req.raw.headers

        let canBroadcast = false
        try {
            const { success } = await ctx.get('auth').api.hasPermission({
                headers: authHeaders,
                body: { permissions: { ws: ['broadcast'] } },
            })
            canBroadcast = success
        } catch {
            // Unauthenticated or session-less requests — listen-only
        }

        const headers = new Headers(authHeaders)
        headers.set('X-WS-Can-Broadcast', canBroadcast ? 'true' : 'false')

        // README: WebSocket logic is implemented in src/core/durableObject/webSocketServer.ts
        const id = ctx.get('doWssClient').idFromName(channel)
        const stub = ctx.get('doWssClient').get(id)

        return stub.fetch(new Request(ctx.req.raw, { headers }))
    })
}

export const wsRoute = new Hono<THonoInstance>()
    .route('/feedback', createWsChannel('feedback', publicAccess))
    .route('/general', createWsChannel('general', publicAccess))
    .route('/orders', createWsChannel('orders', publicAccess))
    .route('/products', createWsChannel('products', publicAccess))
    .route('/settings', createWsChannel('settings', publicAccess))

export default wsRoute
