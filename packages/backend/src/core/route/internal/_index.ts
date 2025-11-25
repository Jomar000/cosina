import { Hono } from 'hono'

import { corsHandler } from '../../middleware/corsHandler.js'
import { initContext } from '../../middleware/initContext.js'
import { adminRoute } from './admin/_index.js'
import { authRoute } from './auth.js'
import { objectStorageRoute } from './objectStorage.js'
import { userRoute } from './user/_index.js'
import { wsRoute } from './ws.js'

export const internalRoute = new Hono<THonoInstance>()

// Middleware
internalRoute.use(corsHandler('default'))
internalRoute.use(initContext())

// Routes
internalRoute.route('/admin', adminRoute)
internalRoute.route('/auth', authRoute)
internalRoute.route('/objectStorage', objectStorageRoute)
internalRoute.route('/user', userRoute)
internalRoute.route('/ws', wsRoute)

export default internalRoute
