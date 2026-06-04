import {
    passwordChangeInputSchema,
    passwordResetInputSchema,
    passwordResetRequestInputSchema,
    signInInputSchema,
} from '@hyperion/validator/backoffice/auth'
import { eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'
import type { z } from 'zod'

import type { TGlobalApiResponses, THonoInstance } from '../../../types.js'
import { assertUserUnlocked } from '../../../utilities/assertUserUnlocked.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
    auditTrailLogger,
    parseAuthRoles,
} from '../../../utilities/helpers.js'
import { captchaHandler } from '../../middleware/captchaHandler.js'
import { isAuthenticated } from '../../middleware/isAuthenticated.js'
import { validateRequest } from '../../middleware/validateRequest.js'

const signInHandler = async (
    ctx: Context<THonoInstance>,
    input: z.output<typeof signInInputSchema>,
    credentialType: 'email' | 'username',
) => {
    const { accountId, password } = input

    const db = ctx.get('dbClient')
    const { member, user } = ctx.get('dbSchema')

    /**
     * @description
     * Verify the user exists and has an organization membership.
     * Organization ID is not required at sign-in — the session hook derives
     * it from the member table automatically.
     */
    const orgMemberData =
        (
            await db
                .select({ member, user })
                .from(user)
                .innerJoin(member, eq(user.id, member.userId))
                .where(
                    credentialType === 'email'
                        ? eq(user.email, accountId)
                        : eq(user.username, accountId),
                )
                .limit(1)
        )[0] ?? null

    if (!orgMemberData) {
        return apiResponseErrorWrapper(ctx, {
            code: 'UNPROCESSABLE_CONTENT',
            message: 'Invalid credentials provided.',
            status: 422,
        })
    }

    await assertUserUnlocked(ctx, orgMemberData.user.id)

    /**
     * @description
     * Authenticate via better-auth built-in API
     */
    const auth = ctx.get('auth')
    let betterAuthResponse: Response

    try {
        if (credentialType === 'email') {
            betterAuthResponse = await auth.api.signInEmail({
                body: { email: accountId, password },
                headers: ctx.req.raw.headers,
                asResponse: true,
            })
        } else {
            betterAuthResponse = await auth.api.signInUsername({
                body: { username: accountId, password },
                headers: ctx.req.raw.headers,
                asResponse: true,
            })
        }
    } catch {
        return apiResponseErrorWrapper(ctx, {
            code: 'UNPROCESSABLE_CONTENT',
            message: 'Invalid credentials provided.',
            status: 422,
        })
    }

    if (!betterAuthResponse.ok) {
        return apiResponseErrorWrapper(ctx, {
            code: 'UNPROCESSABLE_CONTENT',
            message: 'Invalid credentials provided.',
            status: 422,
        })
    }

    const { permissions, roles } = ctx.get('acl')

    /**
     * @description
     * Forward session cookies from better-auth response
     */
    for (const cookie of betterAuthResponse.headers.getSetCookie()) {
        ctx.header('set-cookie', cookie, { append: true })
    }

    await auditTrailLogger(ctx, {
        component: 'auth',
        action: `signIn.${credentialType}`,
        description: `User signed in via ${credentialType}`,
    })

    return apiResponseOkWrapper(ctx, {
        data: {
            name: orgMemberData.user.username,
            email: orgMemberData.user.email,
            avatar: orgMemberData.user.image ?? '',
            permissions,
            roles,
            userRoles: parseAuthRoles(orgMemberData.member.role),
            expiresAt:
                Math.floor(new Date().getTime() / 1000) +
                Number(ctx.env.SESSION_EXPIRATION),
        },
    })
}

export const authRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .post(
        '/password/change',
        isAuthenticated(),
        validateRequest('json', passwordChangeInputSchema),
        async (ctx) => {
            const { currentPassword, newPassword } = ctx.req.valid('json')

            const auth = ctx.get('auth')

            try {
                await auth.api.changePassword({
                    body: {
                        currentPassword,
                        newPassword,
                        revokeOtherSessions: true,
                    },
                    headers: ctx.req.raw.headers,
                })
            } catch {
                return apiResponseErrorWrapper(ctx, {
                    code: 'UNPROCESSABLE_CONTENT',
                    message:
                        'Password change failed. Please verify your current password.',
                    status: 422,
                })
            }

            await auditTrailLogger(ctx, {
                component: 'auth',
                action: 'password.change',
                description: 'User changed their password',
            })

            return apiResponseOkWrapper(ctx, { data: null })
        },
    )
    .post(
        '/password/reset-request',
        validateRequest('json', passwordResetRequestInputSchema),
        async (ctx) => {
            const { email } = ctx.req.valid('json')

            const auth = ctx.get('auth')

            try {
                await auth.api.requestPasswordReset({
                    body: { email },
                })
            } catch {
                /**
                 * @description
                 * Silently succeed to prevent email enumeration
                 */
            }

            await auditTrailLogger(ctx, {
                component: 'auth',
                action: 'password.resetRequest',
                description: 'Password reset requested',
            })

            return apiResponseOkWrapper(ctx, { data: null })
        },
    )
    .post(
        '/password/reset',
        validateRequest('json', passwordResetInputSchema),
        async (ctx) => {
            const { token, newPassword } = ctx.req.valid('json')

            const auth = ctx.get('auth')

            try {
                await auth.api.resetPassword({
                    body: { token, newPassword },
                })
            } catch {
                return apiResponseErrorWrapper(ctx, {
                    code: 'UNPROCESSABLE_CONTENT',
                    message:
                        'Password reset failed. The token may be invalid or expired.',
                    status: 422,
                })
            }

            await auditTrailLogger(ctx, {
                component: 'auth',
                action: 'password.reset',
                description: 'Password was reset via token',
            })

            return apiResponseOkWrapper(ctx, { data: null })
        },
    )
    .post(
        '/sign-in/email',
        captchaHandler('sign-in-email'),
        validateRequest('json', signInInputSchema),
        async (ctx) => signInHandler(ctx, ctx.req.valid('json'), 'email'),
    )
    .post(
        '/sign-in/username',
        captchaHandler('sign-in-username'),
        validateRequest('json', signInInputSchema),
        async (ctx) => signInHandler(ctx, ctx.req.valid('json'), 'username'),
    )
    .post('/sign-out', async (ctx) => {
        const auth = ctx.get('auth')

        const betterAuthResponse = await auth.api.signOut({
            headers: ctx.req.raw.headers,
            asResponse: true,
        })

        for (const cookie of betterAuthResponse.headers.getSetCookie()) {
            ctx.header('set-cookie', cookie, { append: true })
        }

        await auditTrailLogger(ctx, {
            component: 'auth',
            action: 'signOut',
            description: 'User signed out',
        })

        return apiResponseOkWrapper(ctx, { data: null })
    })

export default authRoute
export type AuthRouteType = ApplyGlobalResponse<
    typeof authRoute,
    TGlobalApiResponses
>
