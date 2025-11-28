import { Hono } from 'hono'

import { passwordRoute } from './password.js'
import { profileRoute } from './profile.js'

export const userRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .route('/password', passwordRoute)
    .route('/profile', profileRoute)

export default userRoute
