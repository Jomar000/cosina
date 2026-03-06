import { Hono } from 'hono'

export const heartbeatRoute = new Hono<THonoInstance>().get('/', (ctx) =>
    ctx.body(null, 204),
)

export default heartbeatRoute
export type HeartbeatRouteType = typeof heartbeatRoute
