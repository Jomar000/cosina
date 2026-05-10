import type { MiddlewareHandler } from 'hono'
import { Hono } from 'hono'

import type { THonoInstance } from '../../../types.js'
import { isAuthorized } from '../../middleware/isAuthorized.js'

const createWsChannel = (
    channel: string,
    authMiddleware: MiddlewareHandler<THonoInstance>,
) => {
    return new Hono<THonoInstance>()
        .use(authMiddleware)
        .get('/', async (ctx) => {
            const upgradeHeader = ctx.req.header('Upgrade')

            if (!upgradeHeader || upgradeHeader !== 'websocket') {
                return ctx.text('Expected Upgrade: websocket', 426)
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

            // README: WebSocket logic is implemented in src/app/durableObject/webSocketServer.ts
            const id = ctx.get('doWssClient').idFromName(channel)
            const stub = ctx.get('doWssClient').get(id)

            return stub.fetch(new Request(ctx.req.raw, { headers }))
        })
}

export const wsRoute = new Hono<THonoInstance>().route(
    '/general',
    createWsChannel(
        'general',
        isAuthorized({
            ws: ['listen'],
        }),
    ),
)

export default wsRoute
