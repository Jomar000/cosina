import type { TApiResponse } from '@hyperion/validator'
import { Hono } from 'hono'

export const passwordRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .post('/override', async (ctx) => {
        // TODO: Password override logic here
        return ctx.json<TApiResponse<string>>(
            { success: true, data: 'TODO' },
            200,
        )
    })

export default passwordRoute
