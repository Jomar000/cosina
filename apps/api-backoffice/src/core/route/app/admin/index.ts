import { Hono } from 'hono'

import { isAuthorized } from '../../../middleware/isAuthorized.js'
import { userRoute } from './user/index.js'

export const adminRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(
        isAuthorized({
            SYSADMIN: ['ANY'],
        }),
    )
    /**
     * @description
     * Routes
     */
    .route('/user', userRoute)

export default adminRoute
export type AdminRouteType = typeof adminRoute
