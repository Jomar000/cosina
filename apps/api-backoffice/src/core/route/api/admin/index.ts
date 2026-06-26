import { Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import type { TGlobalApiResponses, THonoInstance } from '../../../../types.js'
import { isAuthorized } from '../../../middleware/isAuthorized.js'
import auditRoute from './audit/index.js'
import dashboardRoute from './dashboard/index.js'
import orderRoute from './order/index.js'
import { productRoute } from './product/index.js'
import settingsRoute from './settings/index.js'
import { userRoute } from './user/index.js'

export const adminRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(
        '/audit/*',
        isAuthorized({
            SYSADMIN: ['ANY'],
        }),
    )
    .use(
        '/dashboard/*',
        isAuthorized({
            SYSADMIN: ['ANY'],
        }),
    )
    .use(
        '/order/*',
        isAuthorized({
            SYSADMIN: ['ANY'],
        }),
    )
    .use(
        '/product/*',
        isAuthorized({
            SYSADMIN: ['ANY'],
        }),
    )
    .use(
        '/settings/*',
        isAuthorized({
            SYSADMIN: ['ANY'],
        }),
    )
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
    .route('/audit', auditRoute)
    .route('/dashboard', dashboardRoute)
    .route('/order', orderRoute)
    .route('/product', productRoute)
    .route('/settings', settingsRoute)
    .route('/user', userRoute)

export default adminRoute
export type AdminRouteType = ApplyGlobalResponse<
    typeof adminRoute,
    TGlobalApiResponses
>
