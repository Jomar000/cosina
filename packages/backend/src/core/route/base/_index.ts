import { Hono } from 'hono'

import { corsHandler } from '../../middleware/corsHandler.js'

export const baseRoute = new Hono<THonoInstance>()

// Middleware
baseRoute.use(corsHandler('default'))

// Routes
baseRoute.get('/heartbeat', (ctx) => {
    return ctx.body(null, 204)
})

export default baseRoute
