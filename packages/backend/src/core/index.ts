import { Hono } from 'hono'
import { requestId } from 'hono/request-id'

import { AppError } from '../errors.js'
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
            {
                error: {
                    code: 'SERVICE_UNAVAILABLE',
                    message: '🛠️ Service Unavailable 🛠️',
                },
            },
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

    let code = 'INTERNAL_SERVER_ERROR'
    let message = `ERROR: ${ctx.get('requestId')}`

    if (err instanceof AppError) {
        code = err.code
        message = err.message
    }

    return ctx.json(
        {
            error: {
                requestId: ctx.get('requestId'),
                code,
                message,
            },
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
