import { Hono } from 'hono'

import { isAuthorized } from '../../../middleware/isAuthorized.js'

export const passwordRoute = new Hono<THonoInstance>()

passwordRoute.post(
    '/override',
    isAuthorized({
        admin: ['ANY'],
    }),
    // validator('json', async (value, ctx) =>
    //     honoValidatorCb(value, ctx, objectStorageCreateDownloadLinkInputSchema),
    // ),
    async (ctx) => {
        /**
         * For Administrators
         * Override the current user's password and set a new one
         */

        // const keys = ctx.req.valid('json')
        // const { user, userProfile } = ctx.get('dbSchema')

        return ctx.json({ data: '' }, 200)
    },
)

export default passwordRoute
