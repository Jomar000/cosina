import { Hono } from 'hono'

import { corsHandler } from '../../middleware/corsHandler.js'
import { initContext } from '../../middleware/initContext.js'
import internalRouteAuth from './auth.js'
import internalRouteObjectStorage from './objectStorage.js'
import internalRouteWs from './ws.js'

const internalRoute = new Hono<THonoInstance>()

// Middleware
internalRoute.use(corsHandler('default'))
internalRoute.use(initContext())

// Routes
internalRoute.route('/auth', internalRouteAuth)
internalRoute.route('/objectStorage', internalRouteObjectStorage)
internalRoute.route('/ws', internalRouteWs)

export default internalRoute
