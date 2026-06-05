import { Hono } from 'hono'

import type { THonoInstance } from '../../../types.js'
import { corsHandler } from '../../middleware/corsHandler.js'
import { csrfHandler } from '../../middleware/csrfHandler.js'
import {
    initAuthContext,
    initDatabaseContext,
    initObjectStorageContext,
    initRequestContext,
} from '../../middleware/initContext.js'
import { wsOriginGuard } from '../../middleware/wsOriginGuard.js'
import { adminRoute } from './admin/index.js'
import { authRoute } from './auth.js'
import { heartbeatRoute } from './heartbeat.js'
import { objectStorageRoute } from './objectStorage/index.js'
import { userRoute } from './user/index.js'
import { v1Route } from './v1/index.js'
import { wsRoute } from './ws.js'

/** Routes using CORS and CSRF protection. */
const securityApiRoutePatterns = [
    '/admin/*',
    '/auth/*',
    '/objectStorage/*',
    '/user/*',
] as const

/** Routes requiring request, database, and auth context. */
const contextApiRoutePatterns = [
    ...securityApiRoutePatterns,
    '/ws/*',
] as const

export const apiRoute = new Hono<THonoInstance>().use('/ws/*', wsOriginGuard())

for (const routePattern of securityApiRoutePatterns) {
    apiRoute
        .use(routePattern, corsHandler('default'))
        .use(routePattern, csrfHandler())
}

for (const routePattern of contextApiRoutePatterns) {
    apiRoute
        .use(routePattern, initRequestContext())
        .use(routePattern, initDatabaseContext())
        .use(routePattern, initAuthContext())
}

apiRoute
    .use('/objectStorage/*', initObjectStorageContext())
    /**
     * @description
     * Routes
     */
    .route('/admin', adminRoute)
    .route('/auth', authRoute)
    .route('/heartbeat', heartbeatRoute)
    .route('/objectStorage', objectStorageRoute)
    .route('/user', userRoute)
    .route('/v1', v1Route)
    .route('/ws', wsRoute)

export default apiRoute
