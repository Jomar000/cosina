import {
    passwordChangeInputSchema,
    passwordResetInputSchema,
    passwordResetRequestInputSchema,
    signInInputSchema,
} from '@hyperion/validator/public/auth'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { Hono } from 'hono'
import { validator } from 'hono/validator'
import type { z } from 'zod'

import { AppError } from '../../../errors.js'
import type { THonoInstance } from '../../../types.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
    auditTrailLogger,
    validatorCallback,
} from '../../../utilities.js'
import { captchaHandler } from '../../middleware/captchaHandler.js'
import { isAuthenticated } from '../../middleware/isAuthenticated.js'

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
        role,
        user,
        userAttribute,
    } = ctx.get('dbSchema')

    /**
     * @description
     * Verify organization membership
     */
    const orgMemberData =
        (
            await db
                .select()
                .from(user)
                .innerJoin(member, eq(user.id, member.userId))
                .innerJoin(
                    organizationTable,
                    eq(member.organizationId, organizationTable.id),
                )
                .innerJoin(role, eq(member.role, role.name))
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

    /**
     * @description
     * Verify account lock status
     */
    const isLocked =
        (
            await db
                .select({ isLocked: userAttribute.isLocked })
                .from(userAttribute)
                .innerJoin(user, eq(user.id, userAttribute.userId))
                .where(
                    credentialType === 'email'
                        ? eq(user.email, accountId)
                        : eq(user.username, accountId),
                )
        )[0]?.isLocked ?? false

    if (isLocked) {
        throw new AppError({
            code: 'LOCKED',
            message: 'Account is currently locked.',
            status: 423,
        })
    }

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
            ...(orgMemberData.user.image
                ? { avatar: orgMemberData.user.image }
                : {}),
            permissions,
            roles,
            userRoles: orgMemberData.role.name.split(','),
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
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, passwordChangeInputSchema),
        ),
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
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, passwordResetRequestInputSchema),
        ),
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
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, passwordResetInputSchema),
        ),
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
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, signInInputSchema),
        ),
        async (ctx) => signInHandler(ctx, ctx.req.valid('json'), 'email'),
    )
    .post(
        '/sign-in/username',
        captchaHandler('sign-in-username'),
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, signInInputSchema),
        ),
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
export type AuthRouteType = typeof authRoute
