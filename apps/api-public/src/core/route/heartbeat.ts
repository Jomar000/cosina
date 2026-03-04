import { Hono } from 'hono'

import { corsHandler } from '../middleware/corsHandler.js'

export const heartbeatRoute = new Hono<THonoInstance>()
    .use(corsHandler('default'))
    .get('/', (ctx) => ctx.body(null, 204))

export default heartbeatRoute
export type HeartbeatRouteType = typeof heartbeatRoute
