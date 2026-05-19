import { createMiddleware } from 'hono/factory'

import type { THonoInstance } from '../../types.js'
import { assertUserUnlocked } from '../../utilities/assertUserUnlocked.js'
import { apiResponseErrorWrapper } from '../../utilities/helpers.js'

export const isAuthenticated = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        const authData = await ctx.get('auth').api.getSession({
            headers: ctx.req.raw.headers,
        })

        if (!authData) {
            return apiResponseErrorWrapper(ctx, {
                code: 'UNAUTHORIZED',
                message: 'You are not allowed to access this resource.',
                status: 401,
            })
        }

        try {
            await assertUserUnlocked(ctx, authData.user.id)
        } catch (err) {
            const auth = ctx.get('auth')

            await auth.api.revokeSessions({
                headers: ctx.req.raw.headers,
            })

            const signOutResponse = await auth.api.signOut({
                headers: ctx.req.raw.headers,
                asResponse: true,
            })

            for (const cookie of signOutResponse.headers.getSetCookie()) {
                ctx.header('set-cookie', cookie, { append: true })
            }

            throw err
        }

        const { role } = await ctx.get('auth').api.getActiveMemberRole({
            headers: ctx.req.raw.headers,
        })

        ctx.set(
            'isPrivilegedRole',
            [
                'admin',
                'owner',
            ].includes(role),
        )
        ctx.set('role', role)
        ctx.set('session', authData.session)
        ctx.set('user', authData.user)

        await next()
    })
}
