import { Hono } from 'hono'

import { corsHandler } from '../../middleware/corsHandler.js'

export const baseRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(corsHandler('default'))
    /**
     * @description
     * Routes
     */
    .get('/heartbeat', (ctx) => {
        return ctx.body(null, 204)
    })

export default baseRoute
