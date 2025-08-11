import { Hono } from 'hono'

import internalRouteAuth from './auth.js'
import internalRouteObjectStorage from './objectStorage.js'
import internalRouteUser from './user.js'
import internalRouteWs from './ws.js'

const internalRoute = new Hono<THonoInstance>()

internalRoute.route('/auth', internalRouteAuth)
internalRoute.route('/objectStorage', internalRouteObjectStorage)
internalRoute.route('/user', internalRouteUser)
internalRoute.route('/ws', internalRouteWs)

export default internalRoute
