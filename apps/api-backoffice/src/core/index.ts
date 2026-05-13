import { Hono } from 'hono'
import { requestId } from 'hono/request-id'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { v7 as uuidv7 } from 'uuid'

import { AppError } from '../errors.js'
import type { THonoInstance } from '../types.js'
import { apiResponseErrorWrapper } from '../utilities/helpers.js'
import { WebSocketServer } from './durableObject/webSocketServer.js'
import { requestTimer } from './middleware/requestTimer.js'
import { apiRoute } from './route/api/index.js'
import { rootRoute } from './route/root/index.js'
import { v1Route } from './route/v1/index.js'

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
    .use(requestTimer)
    .use(async (ctx, next) => {
        if (ctx.env.STATUS !== 'up') {
            return apiResponseErrorWrapper(ctx, {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Service Unavailable',
                status: 503,
            })
        }

        await next()
    })
    /**
     * @description
     * Routes
     */
    .route('/', rootRoute)
    .route('/api', apiRoute)
    .route('/v1', v1Route)

export default app
export { WebSocketServer }
