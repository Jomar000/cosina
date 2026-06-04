import type { MiddlewareHandler } from 'hono'
import { Hono } from 'hono'

import type { THonoInstance } from '../../../types.js'
import { apiResponseErrorWrapper } from '../../../utilities/helpers.js'
import { isAuthorized } from '../../middleware/isAuthorized.js'

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

        const { success: canBroadcast } = await ctx
            .get('auth')
            .api.hasPermission({
                headers: authHeaders,
                body: {
                    permissions: {
                        ws: ['broadcast'],
                    },
                },
            })

        const headers = new Headers(authHeaders)
        headers.set('X-WS-Can-Broadcast', canBroadcast ? 'true' : 'false')

        // README: WebSocket logic is implemented in src/core/durableObject/webSocketServer.ts
        const id = ctx.get('doWssClient').idFromName(channel)
        const stub = ctx.get('doWssClient').get(id)

        return stub.fetch(new Request(ctx.req.raw, { headers }))
    })
}

/**
 * Public listen-only WebSocket channel for product broadcasts.
 * No auth required — customers connect here to receive real-time product updates.
 * canBroadcast is always false so public clients cannot send messages.
 */
const publicProductsChannel = new Hono<THonoInstance>().get(
    '/',
    async (ctx) => {
        const upgradeHeader = ctx.req.header('Upgrade')

        if (!upgradeHeader || upgradeHeader !== 'websocket') {
            return apiResponseErrorWrapper(ctx, {
                code: 'WEBSOCKET_UPGRADE_REQUIRED',
                message: 'Expected Upgrade: websocket',
                status: 426,
            })
        }

        const headers = new Headers(ctx.req.raw.headers)
        headers.set('X-WS-Can-Broadcast', 'false')

        const id = ctx.get('doWssClient').idFromName('products')
        const stub = ctx.get('doWssClient').get(id)

        return stub.fetch(new Request(ctx.req.raw, { headers }))
    },
)

/**
 * Public listen-only WebSocket channel for order status broadcasts.
 * No auth required — customers connect here to receive real-time order
 * status updates. Shares the same Durable Object instance as the admin
 * orders channel so admin status changes are immediately visible.
 * canBroadcast is always false so public clients cannot send messages.
 */
const publicOrdersChannel = new Hono<THonoInstance>().get('/', async (ctx) => {
    const upgradeHeader = ctx.req.header('Upgrade')

    if (!upgradeHeader || upgradeHeader !== 'websocket') {
        return apiResponseErrorWrapper(ctx, {
            code: 'WEBSOCKET_UPGRADE_REQUIRED',
            message: 'Expected Upgrade: websocket',
            status: 426,
        })
    }

    const headers = new Headers(ctx.req.raw.headers)
    headers.set('X-WS-Can-Broadcast', 'false')

    const id = ctx.get('doWssClient').idFromName('orders')
    const stub = ctx.get('doWssClient').get(id)

    return stub.fetch(new Request(ctx.req.raw, { headers }))
})

export const wsRoute = new Hono<THonoInstance>()
    .route(
        '/general',
        createWsChannel(
            'general',
            isAuthorized({
                ws: ['listen'],
            }),
        ),
    )
    .route('/orders', publicOrdersChannel)
    .route('/products', publicProductsChannel)

export default wsRoute
