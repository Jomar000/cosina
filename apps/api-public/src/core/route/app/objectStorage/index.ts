import { Hono } from 'hono'

import { isAuthenticated } from '../../../middleware/isAuthenticated.js'
import { downloadRoute } from './download.js'
import { uploadRoute } from './upload.js'
import { uploadAttachmentRoute } from './uploadAttachment.js'

export const objectStorageRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(isAuthenticated())
    /**
     * @description
     * Routes
     */
    .route('/download', downloadRoute)
    .route('/upload', uploadRoute)
    .route('/upload/attachment', uploadAttachmentRoute)

export default objectStorageRoute
export type ObjectStorageRouteType = typeof objectStorageRoute
