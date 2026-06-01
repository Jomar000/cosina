import { Hono } from 'hono'

import { corsHandler } from '../../middleware/corsHandler.js'
import { csrfHandler } from '../../middleware/csrfHandler.js'
import { heartbeatRoute } from './heartbeat.js'

export const rootRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(corsHandler('default'))
    .use(csrfHandler())
    /**
     * @description
     * Routes
     */
    .route('/heartbeat', heartbeatRoute)

export default rootRoute
