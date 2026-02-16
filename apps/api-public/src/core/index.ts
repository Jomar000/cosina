import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { v7 as uuidv7 } from 'uuid'

import { AppError } from '../errors.js'
import { apiResponseErrorWrapper } from '../utilities.js'
import { WebSocketServer } from './durableObject/webSocketServer.js'
import { csrfHandler } from './middleware/csrfHandler.js'
import { baseRoute } from './route/base/_index.js'
import { internalRoute } from './route/internal/_index.js'
import { v1Route } from './route/v1/_index.js'

export const app = new Hono<THonoInstance>()
    /**
     * @description
     * Error Handler
     */
    .onError((err, ctx) => {
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
        let message = 'An unknown error occurred, please try again later.'
        let status: ContentfulStatusCode = 500

        if (err instanceof AppError) {
            code = err.code
            message = err.message
            status = err.status
        }

        return apiResponseErrorWrapper(ctx, { message, code, status })
    })
    /**
     * @description
     * Middleware
     */
    .use(
        requestId({
            headerName: '',
            generator: () => uuidv7(),
        }),
    )
    .use(async (ctx, next) => {
        if (ctx.env.STATUS !== 'up') {
            return apiResponseErrorWrapper(ctx, {
                code: 'SERVICE_UNAVAILABLE',
                message: '🛠️ Service Unavailable 🛠️',
                status: 503,
            })
        }

        await next()
    })
    .use(csrfHandler())
    /**
     * @description
     * Routes
     */
    .route('/', baseRoute)
    .route('/internal', internalRoute)
    .route('/v1', v1Route)

export default app
export { WebSocketServer }
export type AppType = typeof app
