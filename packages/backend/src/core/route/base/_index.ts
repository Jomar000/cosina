import { Hono } from 'hono'

import { corsHandler } from '../../middleware/corsHandler.js'

const baseRoute = new Hono<THonoInstance>()

// Middleware
baseRoute.use(corsHandler('default'))

// Routes
baseRoute.get('/healthCheck', (ctx) => {
    return ctx.json({ success: true, message: '✅ Operational ✅' }, 200)
})

export default baseRoute
