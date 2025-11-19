import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { v7 as uuidv7 } from 'uuid'

import { AppError } from '../errors.js'
import { WebSocketServer } from './durableObject/webSocketServer.js'
import { csrfHandler } from './middleware/csrfHandler.js'
import { baseRoute } from './route/base/_index.js'
import { internalRoute } from './route/internal/_index.js'
import { v1Route } from './route/v1/_index.js'

const app = new Hono<THonoInstance>()

// Middleware
app.use(
    requestId({
        headerName: '',
        generator: () => uuidv7(),
    }),
)
app.use(async (ctx, next) => {
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
app.use(csrfHandler())

// Error Handler
app.onError((err, ctx) => {
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
    let status: ContentfulStatusCode = 500

    if (err instanceof AppError) {
        code = err.code
        message = err.message
        status = err.status
    }

    return ctx.json(
        {
            error: {
                requestId: ctx.get('requestId'),
                code,
                message,
            },
        },
        status,
    )
})

// Routes
app.route('/', baseRoute)
app.route('/internal', internalRoute)
app.route('/v1', v1Route)

export default app
export { WebSocketServer }
