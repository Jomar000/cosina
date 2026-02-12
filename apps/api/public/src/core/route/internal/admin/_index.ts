import { Hono } from 'hono'

import { isAuthorized } from '../../../middleware/isAuthorized.js'
import { userRoute } from './user/_index.js'

export const adminRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(
        isAuthorized({
            admin: ['ANY'],
        }),
    )
    /**
     * @description
     * Routes
     */
    .route('/user', userRoute)

export default adminRoute
