import { Hono } from 'hono'

import { corsHandler } from '../../middleware/corsHandler.js'
import { initContext } from '../../middleware/initContext.js'
import { adminRoute } from './admin/_index.js'
import { authRoute } from './auth.js'
import { objectStorageRoute } from './objectStorage.js'
import { userRoute } from './user/_index.js'
import { wsRoute } from './ws.js'

export const internalRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(corsHandler('default'))
    .use(initContext())
    /**
     * @description
     * Routes
     */
    .route('/admin', adminRoute)
    .route('/auth', authRoute)
    .route('/objectStorage', objectStorageRoute)
    .route('/user', userRoute)
    .route('/ws', wsRoute)

export default internalRoute
