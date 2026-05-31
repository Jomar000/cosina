import { Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import type { TGlobalApiResponses, THonoInstance } from '../../../../types.js'
import { isAuthenticated } from '../../../middleware/isAuthenticated.js'
import { profileRoute } from './profile.js'

export const userRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use('/profile/*', isAuthenticated())
    /**
     * @description
     * Routes
     */
    .route('/profile', profileRoute)

export default userRoute
export type UserRouteType = ApplyGlobalResponse<
    typeof userRoute,
    TGlobalApiResponses
>
