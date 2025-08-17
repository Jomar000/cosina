import { Hono } from 'hono'
import { requestId } from 'hono/request-id'

import { WebSocketServer } from './durableObject/webSocketServer.js'
import { csrfHandler } from './middleware/csrfHandler.js'
import baseRoute from './route/base/_index.js'
import internalRoute from './route/internal/_index.js'
import v1Route from './route/v1/_index.js'

const hono = new Hono<THonoInstance>()

// Middleware
hono.use(requestId({ headerName: '' }))
hono.use(async (ctx, next) => {
    if (ctx.env.STATUS !== 'up') {
        return ctx.json(
            { success: false, message: '🛠️ Service Unavailable 🛠️' },
            503,
        )
    }

    await next()
})
hono.use(csrfHandler())

// Error Handler
hono.onError((err, ctx) => {
    // CloudFlare Workers Observability Logs
    // https://developers.cloudflare.com/workers/observability/logs/

    console.error({
        requestId: ctx.get('requestId'),
        name: err.name,
        message: err.message,
        stack: err.stack,
        cause: err.cause,
    })

    return ctx.json(
        {
            message: 'An error has occurred.',
            requestId: ctx.get('requestId'),
        },
        500,
    )
})

// Routes
hono.route('/', baseRoute)
hono.route('/internal', internalRoute)
hono.route('/v1', v1Route)

export default hono
export { WebSocketServer }
