import { password } from '@hyperion/validator/backoffice/admin/user'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { validator } from 'hono/validator'

import { AppError } from '../../../../../errors.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
    auditTrailLogger,
    validatorCallback,
} from '../../../../../utilities.js'

export const passwordRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .post(
        '/reset-request',
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, password.resetRequestInputSchema),
        ),
        async (ctx) => {
            const { userId } = ctx.req.valid('json')

            const db = ctx.get('dbClient')
            const { member, user } = ctx.get('dbSchema')

            /**
             * @description
             * Verify target user belongs to admin's organization
             */
            const targetUser = (
                await db
                    .select({ email: user.email })
                    .from(user)
                    .innerJoin(member, eq(user.id, member.userId))
                    .where(
                        and(
                            eq(member.userId, userId),
                            eq(
                                member.organizationId,
                                ctx.get('session')!.activeOrganizationId!,
                            ),
                        ),
                    )
            )[0]

            if (!targetUser) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'User ID not found.',
                    status: 404,
                })
            }

            /**
             * @description
             * Trigger password reset email via better-auth
             */
            const auth = ctx.get('auth')

            try {
                await auth.api.requestPasswordReset({
                    body: { email: targetUser.email },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'PASSWORD_RESET_REQUEST_FAILED',
                        message: 'Password reset request failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }

            await auditTrailLogger(ctx, {
                component: 'admin.user.password',
                action: 'reset_request',
                description: 'Admin requested password reset for user',
                records: { table: 'user', id: userId },
            })

            return apiResponseOkWrapper(ctx, { data: null })
        },
    )
    .post(
        '/reset',
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, password.resetInputSchema),
        ),
        async (ctx) => {
            const { userId, newPassword } = ctx.req.valid('json')

            const db = ctx.get('dbClient')
            const { account, member } = ctx.get('dbSchema')

            /**
             * @description
             * Verify target user belongs to admin's organization
             */
            const targetMember = (
                await db
                    .select({ userId: member.userId })
                    .from(member)
                    .where(
                        and(
                            eq(member.userId, userId),
                            eq(
                                member.organizationId,
                                ctx.get('session')!.activeOrganizationId!,
                            ),
                        ),
                    )
            )[0]

            if (!targetMember) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'User ID not found.',
                    status: 404,
                })
            }

            /**
             * @description
             * Hash and set the new password directly via better-auth context
             */
            const auth = ctx.get('auth')

            try {
                const hashedPassword =
                    await auth.options.emailAndPassword?.password?.hash(
                        newPassword,
                    )

                if (!hashedPassword) {
                    throw new Error('Password hashing failed.')
                }

                await db
                    .update(account)
                    .set({ password: hashedPassword })
                    .where(
                        and(
                            eq(account.userId, userId),
                            eq(account.providerId, 'credential'),
                        ),
                    )
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'PASSWORD_RESET_FAILED',
                        message: 'Password reset failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }

            await auditTrailLogger(ctx, {
                component: 'admin.user.password',
                action: 'reset',
                description: 'Admin reset password for user',
                records: { table: 'user', id: userId },
            })

            return apiResponseOkWrapper(ctx, { data: null })
        },
    )

export default passwordRoute
