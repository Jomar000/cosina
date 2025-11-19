import { Hono } from 'hono'

import { corsHandler } from '../../middleware/corsHandler.js'
import { initContext } from '../../middleware/initContext.js'

export const v1Route = new Hono<THonoInstance>()

// Middleware
v1Route.use(corsHandler('default'))
v1Route.use(initContext())

// Routes

export default v1Route
