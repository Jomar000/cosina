import { Hono } from 'hono'

import type { THonoInstance } from '../../../types.js'

export const heartbeatRoute = new Hono<THonoInstance>().get('/', (ctx) =>
    ctx.body(null, 204),
)

export default heartbeatRoute
export type HeartbeatRouteType = typeof heartbeatRoute
