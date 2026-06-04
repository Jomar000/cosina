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
 * Orders channel routes through the PUBLIC API's Durable Object so that
 * orders placed by customers (via api-public) and admin mutations both
 * broadcast to the same DO instance and admins receive all events.
 */
const adminOrdersChannel = new Hono<THonoInstance>().get(
    '/',
    isAuthorized({ ws: ['listen'] }),
    async (ctx) => {
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

        const id = ctx.env.HYPERIONPUB_DO_WSS.idFromName('orders')
        const stub = ctx.env.HYPERIONPUB_DO_WSS.get(id)

        return stub.fetch(new Request(ctx.req.raw, { headers }))
    },
)

/**
 * Settings channel routes through the PUBLIC API's Durable Object so that
 * admin setting changes are immediately broadcast to all public clients
 * listening on the same DO instance.
 */
const adminSettingsChannel = new Hono<THonoInstance>().get(
    '/',
    isAuthorized({ ws: ['listen'] }),
    async (ctx) => {
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
                body: { permissions: { ws: ['broadcast'] } },
            })

        const headers = new Headers(authHeaders)
        headers.set('X-WS-Can-Broadcast', canBroadcast ? 'true' : 'false')

        const id = ctx.env.HYPERIONPUB_DO_WSS.idFromName('settings')
        const stub = ctx.env.HYPERIONPUB_DO_WSS.get(id)

        return stub.fetch(new Request(ctx.req.raw, { headers }))
    },
)

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
    .route(
        '/products',
        createWsChannel(
            'products',
            isAuthorized({
                ws: ['listen'],
            }),
        ),
    )
    .route('/orders', adminOrdersChannel)
    .route('/settings', adminSettingsChannel)

export default wsRoute
