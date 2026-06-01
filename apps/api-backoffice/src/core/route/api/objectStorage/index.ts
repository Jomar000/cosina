import { Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import type { TGlobalApiResponses, THonoInstance } from '../../../../types.js'
import { isAuthenticated } from '../../../middleware/isAuthenticated.js'
import { objectStorageContext } from '../../../middleware/objectStorageContext.js'
import { downloadRoute } from './download.js'
import { uploadRoute } from './upload.js'
import { uploadAttachmentRoute } from './uploadAttachment.js'

export const objectStorageRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use('/download/*', isAuthenticated())
    .use('/upload/*', isAuthenticated())
    .use('/*', objectStorageContext())
    /**
     * @description
     * Routes
     */
    .route('/download', downloadRoute)
    .route('/upload', uploadRoute)
    .route('/upload/attachment', uploadAttachmentRoute)

export default objectStorageRoute
export type ObjectStorageRouteType = ApplyGlobalResponse<
    typeof objectStorageRoute,
    TGlobalApiResponses
>
