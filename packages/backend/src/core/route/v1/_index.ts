import { Hono } from 'hono'

import { corsHandler } from '../../middleware/corsHandler.js'
import { initContext } from '../../middleware/initContext.js'

export const v1Route = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(corsHandler('default'))
    /**
     * @description
     * Routes
     */
    .use(initContext())

export default v1Route
