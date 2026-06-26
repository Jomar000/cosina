import { dbClient, dbSchema } from '@hyperion/database/postgres'
import type { TApiResponseError, TApiResponseOk } from '@hyperion/types/shared'
import { createEmailVerificationToken } from 'better-auth/api'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '../../src/core/index.js'
import { interceptPasswordResetToken } from '../utilities.js'

let db: ReturnType<typeof dbClient>

beforeAll(() => {
    db = dbClient({
        host: env.HYPERIONBOFC_HD.host,
        port: Number(env.HYPERIONBOFC_HD.port) || 5432,
        database: env.HYPERIONBOFC_HD.database,
        user: env.HYPERIONBOFC_HD.user,
        pass: env.HYPERIONBOFC_HD.password,
    })
})

afterAll(async () => {
    await db.$client.end()
})

const restoreMutableAuthAttribute = async () => {
    const { userAttribute } = dbSchema

    await db
        .delete(userAttribute)
        .where(eq(userAttribute.userId, 'USER_AUTH_MUTABLE'))
    await db.insert(userAttribute).values({
        userId: 'USER_AUTH_MUTABLE',
        isLocked: false,
    })
}

const signInMutableAuthUser = async () => {
    const response = await app.request(
        '/api/auth/signIn/username',
        {
            method: 'POST',
            headers: {
                origin: env.URL_FRONTEND,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                organizationId: 'superorganization',
                accountId: 'auth_mutable',
                password: 'P@ssw0rd1234',
            }),
        },
        env,
    )

    expect(response.status).toBe(200)

    return response.headers.getSetCookie().join('; ')
}

const verificationUser = {
    id: 'USER_EMAIL_VERIFICATION_BACKOFFICE',
    name: 'EMAIL VERIFICATION BACKOFFICE',
    email: 'email.verification.backoffice@hyperion.app',
    username: 'email_verification_backoffice',
}

/**
 * @description
 * Expected postgres.js Worker stream-cancellation rejections are filtered by
 * the narrow `onUnhandledError` callback in vitest.config.ts.
 */

describe('Auth Endpoint', () => {
    describe('Sequential Tests', () => {
        describe('Email Verification Flow', () => {
            let verificationToken = ''

            beforeAll(async () => {
                const { user } = dbSchema

                await db.delete(user).where(eq(user.id, verificationUser.id))
                await db.insert(user).values(verificationUser)
                verificationToken = await createEmailVerificationToken(
                    env.BETTER_AUTH_SECRET,
                    verificationUser.email,
                )
            })

            afterAll(async () => {
                const { user } = dbSchema
                await db.delete(user).where(eq(user.id, verificationUser.id))
            })

            it('Valid token should verify the user.', async () => {
                const response = await app.request(
                    `/api/auth/verifyEmail?token=${encodeURIComponent(verificationToken)}`,
                    {
                        method: 'GET',
                        headers: { origin: env.URL_FRONTEND },
                    },
                    env,
                )
                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data).toBeNull()

                const { user } = dbSchema
                const [verifiedUser] = await db
                    .select({ emailVerified: user.emailVerified })
                    .from(user)
                    .where(eq(user.id, verificationUser.id))

                expect(verifiedUser.emailVerified).toBe(true)
            })

            it('Reusing a valid token should remain successful.', async () => {
                const response = await app.request(
                    `/api/auth/verifyEmail?token=${encodeURIComponent(verificationToken)}`,
                    {
                        method: 'GET',
                        headers: { origin: env.URL_FRONTEND },
                    },
                    env,
                )
                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data).toBeNull()
            })
        })

        describe('User Attribute Lock Enforcement', () => {
            it('Sign-in by username with missing user attribute should fail closed.', async () => {
                const response = await app.request(
                    '/api/auth/signIn/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'no_attribute',
                            password: 'P@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(423)
                expect(responseData.error.code).toBe('LOCKED')
                expect(responseData.error.message).toBe(
                    'Account is currently locked.',
                )
            })

            it('Sign-in by email with missing user attribute should fail closed.', async () => {
                const response = await app.request(
                    '/api/auth/signIn/email',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'no.attribute@hyperion.app',
                            password: 'P@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(423)
                expect(responseData.error.code).toBe('LOCKED')
                expect(responseData.error.message).toBe(
                    'Account is currently locked.',
                )
            })

            it('Authenticated session should fail after user is locked.', async () => {
                await restoreMutableAuthAttribute()

                const [
                    firstSessionCookie,
                    secondSessionCookie,
                ] = await Promise.all([
                    signInMutableAuthUser(),
                    signInMutableAuthUser(),
                ])
                const { userAttribute } = dbSchema

                try {
                    await db
                        .update(userAttribute)
                        .set({ isLocked: true })
                        .where(eq(userAttribute.userId, 'USER_AUTH_MUTABLE'))

                    const response = await app.request(
                        '/api/user/profile/read',
                        {
                            method: 'GET',
                            headers: {
                                origin: env.URL_FRONTEND,
                                cookie: firstSessionCookie,
                            },
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(423)
                    expect(responseData.error.code).toBe('LOCKED')
                    expect(responseData.error.message).toBe(
                        'Account is currently locked.',
                    )
                    expect(response.headers.get('set-cookie')).toBeTruthy()

                    const revokedSessionResponse = await app.request(
                        '/api/user/profile/read',
                        {
                            method: 'GET',
                            headers: {
                                origin: env.URL_FRONTEND,
                                cookie: secondSessionCookie,
                            },
                        },
                        env,
                    )

                    const revokedSessionResponseData =
                        await revokedSessionResponse.json<TApiResponseError>()

                    expect(revokedSessionResponse.status).toBe(401)
                    expect(revokedSessionResponseData.error.code).toBe(
                        'UNAUTHORIZED',
                    )
                } finally {
                    await restoreMutableAuthAttribute()
                }
            })

            it('Authenticated session should fail after user attribute is removed.', async () => {
                await restoreMutableAuthAttribute()

                const [
                    firstSessionCookie,
                    secondSessionCookie,
                ] = await Promise.all([
                    signInMutableAuthUser(),
                    signInMutableAuthUser(),
                ])
                const { userAttribute } = dbSchema

                try {
                    await db
                        .delete(userAttribute)
                        .where(eq(userAttribute.userId, 'USER_AUTH_MUTABLE'))

                    const response = await app.request(
                        '/api/user/profile/read',
                        {
                            method: 'GET',
                            headers: {
                                origin: env.URL_FRONTEND,
                                cookie: firstSessionCookie,
                            },
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(423)
                    expect(responseData.error.code).toBe('LOCKED')
                    expect(responseData.error.message).toBe(
                        'Account is currently locked.',
                    )
                    expect(response.headers.get('set-cookie')).toBeTruthy()

                    const revokedSessionResponse = await app.request(
                        '/api/user/profile/read',
                        {
                            method: 'GET',
                            headers: {
                                origin: env.URL_FRONTEND,
                                cookie: secondSessionCookie,
                            },
                        },
                        env,
                    )

                    const revokedSessionResponseData =
                        await revokedSessionResponse.json<TApiResponseError>()

                    expect(revokedSessionResponse.status).toBe(401)
                    expect(revokedSessionResponseData.error.code).toBe(
                        'UNAUTHORIZED',
                    )
                } finally {
                    await restoreMutableAuthAttribute()
                }
            })
        })

        describe('Password Change Flow', () => {
            it('Valid password change should pass.', async () => {
                const mutableAuthCookie = await signInMutableAuthUser()
                const response = await app.request(
                    '/api/auth/password/change',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: mutableAuthCookie,
                        },
                        body: JSON.stringify({
                            currentPassword: 'P@ssw0rd1234',
                            newPassword: 'N3wP@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data).toBeNull()
            })

            it('Sign-in with the new password should pass.', async () => {
                const response = await app.request(
                    '/api/auth/signIn/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'auth_mutable',
                            password: 'N3wP@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData =
                    await response.json<TApiResponseOk<unknown>>()

                expect(response.status).toBe(200)
                expect(response.headers.get('set-cookie')).toBeTruthy()
                expect(responseData).toHaveProperty('data')
            })

            it('Sign-in with the old password should fail.', async () => {
                const response = await app.request(
                    '/api/auth/signIn/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'auth_mutable',
                            password: 'P@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(422)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe(
                    'Invalid credentials provided.',
                )
            })

            it('Restore original password.', async () => {
                /**
                 * @description
                 * Sign in with new password to get a fresh session,
                 * then change back to original.
                 */
                const signInResponse = await app.request(
                    '/api/auth/signIn/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'auth_mutable',
                            password: 'N3wP@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const freshCookie = signInResponse.headers
                    .getSetCookie()
                    .join('; ')

                const response = await app.request(
                    '/api/auth/password/change',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: freshCookie,
                        },
                        body: JSON.stringify({
                            currentPassword: 'N3wP@ssw0rd1234',
                            newPassword: 'P@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
            })
        })

        /**
         * @description
         * Full Password Reset Flow (Token Interception)
         *
         * Simulates the complete user-initiated password reset process:
         * 1. Request password reset and intercept the token
         * 2. Use the token to complete the password reset
         * 3. Verify sign-in with the new password
         *
         * The reset request and token interception are performed in
         * `beforeAll()` so the KV write persists across all `it()` blocks
         * within this `describe()`. Storage isolation is per test file.
         */
        describe('Full Password Reset Flow (Token Interception)', () => {
            let interceptedToken: string

            beforeAll(async () => {
                const response = await app.request(
                    '/api/auth/password/resetRequest',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: 'auth.mutable@hyperion.app',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data).toBeNull()

                interceptedToken =
                    await interceptPasswordResetToken('USER_AUTH_MUTABLE')
                expect(interceptedToken).toBeTruthy()
            })

            it('Step 1: Complete password reset using the intercepted token.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            token: interceptedToken,
                            newPassword: 'R3set@P@ssw0rd5678',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data).toBeNull()
            })

            it('Step 2: Sign-in with the new password should pass.', async () => {
                const response = await app.request(
                    '/api/auth/signIn/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'auth_mutable',
                            password: 'R3set@P@ssw0rd5678',
                        }),
                    },
                    env,
                )

                const responseData =
                    await response.json<TApiResponseOk<unknown>>()

                expect(response.status).toBe(200)
                expect(response.headers.get('set-cookie')).toBeTruthy()
                expect(responseData).toHaveProperty('data')
            })

            it('Step 3: Sign-in with the old password should fail.', async () => {
                const response = await app.request(
                    '/api/auth/signIn/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'auth_mutable',
                            password: 'P@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(422)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe(
                    'Invalid credentials provided.',
                )
            })

            it('Step 4: Restore original password.', async () => {
                /**
                 * @description
                 * Sign in with new password to get a fresh session,
                 * then use password change to restore original.
                 */
                const signInResponse = await app.request(
                    '/api/auth/signIn/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'auth_mutable',
                            password: 'R3set@P@ssw0rd5678',
                        }),
                    },
                    env,
                )

                const freshCookie = signInResponse.headers
                    .getSetCookie()
                    .join('; ')

                const response = await app.request(
                    '/api/auth/password/change',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: freshCookie,
                        },
                        body: JSON.stringify({
                            currentPassword: 'R3set@P@ssw0rd5678',
                            newPassword: 'P@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
            })
        })
    })
})
