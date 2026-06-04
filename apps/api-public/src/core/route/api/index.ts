import { Hono } from 'hono'

import type { THonoInstance } from '../../../types.js'
import { corsHandler } from '../../middleware/corsHandler.js'
import { csrfHandler } from '../../middleware/csrfHandler.js'
import { initContext } from '../../middleware/initContext.js'
import { adminRoute } from './admin/index.js'
import { authRoute } from './auth.js'
import { objectStorageRoute } from './objectStorage/index.js'
import { orderRoute } from './order/index.js'
import { productRoute } from './product/index.js'
import { userRoute } from './user/index.js'
import { wsRoute } from './ws.js'

export const apiRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use('/*', corsHandler('default'))
    .use('/*', csrfHandler())
    .use('/*', initContext())
    /**
     * @description
     * Routes
     */
    .route('/admin', adminRoute)
    .route('/auth', authRoute)
    .route('/objectStorage', objectStorageRoute)
    .route('/order', orderRoute)
    .route('/product', productRoute)
    .route('/user', userRoute)
    .route('/ws', wsRoute)

export default apiRoute
