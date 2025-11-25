import { Hono } from 'hono'

import { isAuthorized } from '../../../middleware/isAuthorized.js'
import { userRoute } from './user/_index.js'

export const adminRoute = new Hono<THonoInstance>()

// Middleware
adminRoute.use(
    isAuthorized({
        admin: ['ANY'],
    }),
)

// Routes
adminRoute.route('/user', userRoute)

export default adminRoute
