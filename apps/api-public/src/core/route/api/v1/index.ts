import { Hono } from 'hono'

import type { THonoInstance } from '../../../../types.js'
import { corsHandler } from '../../../middleware/corsHandler.js'
import { initRequestContext } from '../../../middleware/initContext.js'

export const v1Route = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use(corsHandler('reflect'))
    /**
     * CSRF is intentionally omitted. This route is a public API consumed via
     * API keys only — no cookie-based authentication is used here. CORS is set
     * to reflect mode to allow any origin, and credentials are never permitted
     * in reflect mode, so the browser-based CSRF attack vector does not apply.
     */
    .use(initRequestContext())
/**
 * @description
 * Routes
 */

export default v1Route
