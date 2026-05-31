import { Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import type { TGlobalApiResponses, THonoInstance } from '../../../../types.js'
import { isAuthorized } from '../../../middleware/isAuthorized.js'
import { userRoute } from './user/index.js'

export const adminRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(
        '/user/*',
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
export type AdminRouteType = ApplyGlobalResponse<
    typeof adminRoute,
    TGlobalApiResponses
>
