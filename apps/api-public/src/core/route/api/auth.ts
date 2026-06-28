import {
    passwordChangeInputSchema,
    passwordResetInputSchema,
    passwordResetRequestInputSchema,
    signInInputSchema,
    verifyEmailInputSchema,
} from '@cosina/validator/public/auth'
import { and, eq } from 'drizzle-orm'
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
    canLoginAuthRole,
    parseAuthRoles,
} from '../../../utilities/helpers.js'
import { captchaHandler } from '../../middleware/captchaHandler.js'
import { isAuthenticated } from '../../middleware/isAuthenticated.js'
import { validateRequest } from '../../middleware/validateRequest.js'

// Roles allowed to authenticate on this API surface.
const loginAuthRoles = [] as const

const signInHandler = async (
    ctx: Context<THonoInstance>,
    input: z.output<typeof signInInputSchema>,
    credentialType: 'email' | 'username',
) => {
    const { organizationId, accountId, password } = input

    const db = ctx.get('dbClient')
    const {
        member,
        organization: organizationTable,
        user,
    } = ctx.get('dbSchema')

    /**
     * @description
     * Verify organization membership
     */
    const orgMemberData =
        (
            await db
                .select({ member, user })
                .from(user)
                .innerJoin(member, eq(user.id, member.userId))
                .innerJoin(
                    organizationTable,
                    eq(member.organizationId, organizationTable.id),
                )
                .where(
                    and(
                        credentialType === 'email'
                            ? eq(user.email, accountId)
                            : eq(user.username, accountId),
                        eq(organizationTable.slug, organizationId),
                    ),
                )
        )[0] ?? null

    if (!orgMemberData) {
        return apiResponseErrorWrapper(ctx, {
            code: 'UNPROCESSABLE_CONTENT',
            message: 'Invalid credentials provided.',
            status: 422,
        })
    }

    if (!canLoginAuthRole(orgMemberData.member.role, loginAuthRoles)) {
        return apiResponseErrorWrapper(ctx, {
            code: 'FORBIDDEN',
            message: 'You are not allowed to access this resource.',
            status: 403,
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
                query: { organizationId },
                headers: ctx.req.raw.headers,
                asResponse: true,
            })
        } else {
            betterAuthResponse = await auth.api.signInUsername({
                body: { username: accountId, password },
                query: { organizationId },
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
    const userRoles = parseAuthRoles(orgMemberData.member.role)
    const userRoleDefinitions = Object.fromEntries(
        userRoles.flatMap((role) =>
            roles[role]
                ? [
                      [
                          role,
                          roles[role],
                      ] as const,
                  ]
                : [],
        ),
    )

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
            roles: userRoleDefinitions,
            userRoles,
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
        '/password/resetRequest',
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
        '/signIn/email',
        captchaHandler('sign-in-email'),
        validateRequest('json', signInInputSchema),
        async (ctx) => signInHandler(ctx, ctx.req.valid('json'), 'email'),
    )
    .post(
        '/signIn/username',
        captchaHandler('sign-in-username'),
        validateRequest('json', signInInputSchema),
        async (ctx) => signInHandler(ctx, ctx.req.valid('json'), 'username'),
    )
    .post('/signOut', async (ctx) => {
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
    .get(
        '/verifyEmail',
        validateRequest('query', verifyEmailInputSchema),
        async (ctx) => {
            const { token } = ctx.req.valid('query')
            const auth = ctx.get('auth')

            try {
                // Since onAPIError.throw is true, this will throw on failure
                await auth.api.verifyEmail({
                    query: { token },
                })
            } catch {
                return apiResponseErrorWrapper(ctx, {
                    code: 'UNPROCESSABLE_CONTENT',
                    message:
                        'Email verification failed. The token may be invalid or expired.',
                    status: 422,
                })
            }

            await auditTrailLogger(ctx, {
                component: 'auth',
                action: 'verifyEmail',
                description: 'User verified their email address',
            })

            return apiResponseOkWrapper(ctx, { data: null })
        },
    )

export default authRoute
export type AuthRouteType = ApplyGlobalResponse<
    typeof authRoute,
    TGlobalApiResponses
>
