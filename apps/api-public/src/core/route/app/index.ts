import { Hono } from 'hono'

import { corsHandler } from '../../middleware/corsHandler.js'
import { csrfHandler } from '../../middleware/csrfHandler.js'
import { initContext } from '../../middleware/initContext.js'
import { adminRoute } from './admin/index.js'
import { authRoute } from './auth.js'
import { objectStorageRoute } from './objectStorage.js'
import { userRoute } from './user/index.js'
import { wsRoute } from './ws.js'

export const appRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(corsHandler('default'))
    .use(csrfHandler())
    .use(initContext())
    /**
     * @description
     * Routes
     */
    .route('/admin', adminRoute)
    .route('/auth', authRoute)
    .route('/objectStorage', objectStorageRoute)
    .route('/user', userRoute)

/**
 * @description
 * Routes excluded from RPC Type Inference
 */
appRoute.route('/ws', wsRoute)

export default appRoute
