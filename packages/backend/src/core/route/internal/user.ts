// import {} from '@hyperion/validator/internal/userProfile'
// import { eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
// import { validator } from 'hono/validator'

// import { honoValidatorCb, nanoidCustom } from '../../../utilities.js'
import { isAuthenticated } from '../../middleware/isAuthenticated.js'

const internalRouteUser = new Hono<THonoInstance>()

internalRouteUser.post(
    '/user/profile/update',
    isAuthenticated(),
    // validator('json', async (value, ctx) =>
    //     honoValidatorCb(value, ctx, objectStorageCreateDownloadLinkInputSchema),
    // ),
    async (ctx) => {
        // const keys = ctx.req.valid('json')

        // const { user, userProfile } = ctx.get('dbSchema')

        return ctx.json({ data: '' }, 200)
    },
)

export default internalRouteUser
