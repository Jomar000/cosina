import { Hono } from 'hono'

import type { THonoInstance } from '../../../../types.js'
import { isAuthenticated } from '../../../middleware/isAuthenticated.js'
import { profileRoute } from './profile.js'

export const userRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(isAuthenticated())
    /**
     * @description
     * Routes
     */
    .route('/profile', profileRoute)

export default userRoute
export type UserRouteType = typeof userRoute
