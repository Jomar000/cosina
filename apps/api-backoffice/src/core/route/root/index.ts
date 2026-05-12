import { Hono } from 'hono'

import type { THonoInstance } from '../../../types.js'
import { heartbeatRoute } from './heartbeat.js'

export const rootRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .route('/heartbeat', heartbeatRoute)

export default rootRoute
