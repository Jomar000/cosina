import { Hono } from 'hono'

import { isAuthenticated } from '../../../middleware/isAuthenticated.js'
import { objectStoragePrivate } from './private.js'
import { objectStoragePublic } from './public.js'

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
    .route('/private', objectStoragePrivate)
    .route('/public', objectStoragePublic)
