import { Hono } from 'hono'
import { requestId } from 'hono/request-id'

import { WebSocketServer } from './durableObject/webSocketServer.js'
import internalRoute from './internal/_index.js'
import { corsHandler } from './middleware/corsHandler.js'
import { csrfHandler } from './middleware/csrfHandler.js'
import { initContext } from './middleware/initContext.js'
import v1Route from './v1/_index.js'

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
hono.use(initContext())
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
hono.use(corsHandler('reflect')).get('/healthCheck', (ctx) => {
    return ctx.json({ success: true }, 200)
})
hono.use(corsHandler('default')).route('/internal', internalRoute)
hono.use(corsHandler('reflect')).route('/v1', v1Route)

export default hono
export { WebSocketServer }
