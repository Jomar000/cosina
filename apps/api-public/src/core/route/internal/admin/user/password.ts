import { Hono } from 'hono'
import { apiResponseOkWrapper } from '../../../../../utilities.js'

export const passwordRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .post('/override', async (ctx) => {
        // TODO: Password override logic here

        return apiResponseOkWrapper(ctx, {
            data: 'TODO',
        })
    })

export default passwordRoute
