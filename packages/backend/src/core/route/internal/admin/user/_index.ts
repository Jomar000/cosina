import { Hono } from 'hono'

import { passwordRoute } from './password.js'
import { profileRoute } from './profile.js'

export const userRoute = new Hono<THonoInstance>()

// Routes
userRoute.route('/password', passwordRoute)
userRoute.route('/profile', profileRoute)

export default userRoute
