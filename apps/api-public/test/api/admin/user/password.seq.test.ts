import { dbClient, dbSchema } from '@hyperion/database/postgres'
import type { TApiResponseError, TApiResponseOk } from '@hyperion/types/shared'
import { env } from 'cloudflare:workers'
import { and, desc, eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'

import app from '../../../../src/core/index.js'
import {
    interceptPasswordResetToken,
    setTestingCookies,
} from '../../../utilities.js'

let privilegedCookie: string

const getDb = () =>
    dbClient({
        host: env.HYPERIONPUB_HD.host,
        port: Number(env.HYPERIONPUB_HD.port) || 5432,
        database: env.HYPERIONPUB_HD.database,
        user: env.HYPERIONPUB_HD.user,
        pass: env.HYPERIONPUB_HD.password,
    })

beforeAll(async () => {
    ;[privilegedCookie] = await setTestingCookies()
})

/**
 * @description
 * Admin Password Endpoint
 *
 * Route: /api/admin/user/password
 *
 * Test accounts from seed data:
 * - USER_001 (superadministrator, owner) — privileged
 * - USER_002 (administrator, admin)
 * - USER_003 (member, member) — standard
 * - USER_999 (locked, member)
 */

describe('Admin User Password Endpoint', () => {
    describe('Sequential Tests', () => {
        /**
         * @description
         * Reset Request (Email OTP Flow)
         */
        describe('Reset Request Flow', () => {
            it('Reset request for a valid organization member should pass.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_PASSWORD_MUTABLE',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data).toBeNull()
            })
        })

        /**
         * @description
         * Direct Reset (Admin sets password directly)
         */
        describe('Direct Reset Flow', () => {
            it('Direct password reset for a valid organization member should pass.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_PASSWORD_MUTABLE',
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

            it('Direct password reset should write a redacted account audit trail record.', async () => {
                const db = getDb()
                const { account, auditTrail } = dbSchema

                try {
                    const [credential] = await db
                        .select({ id: account.id })
                        .from(account)
                        .where(
                            and(
                                eq(account.userId, 'USER_PASSWORD_MUTABLE'),
                                eq(account.providerId, 'credential'),
                            ),
                        )

                    const [auditTrailEntry] = await db
                        .select({ records: auditTrail.records })
                        .from(auditTrail)
                        .where(
                            and(
                                eq(auditTrail.component, 'admin.user.password'),
                                eq(auditTrail.action, 'reset'),
                            ),
                        )
                        .orderBy(desc(auditTrail.id))
                        .limit(1)

                    expect(credential).toBeTruthy()
                    expect(auditTrailEntry.records).toEqual([
                        {
                            table: 'account',
                            id: credential.id,
                            oldData: {
                                password: '[REDACTED]',
                            },
                        },
                    ])
                } finally {
                    await db.$client.end()
                }
            })

            it('Sign-in with the new password after direct reset should pass.', async () => {
                const response = await app.request(
                    '/api/auth/sign-in/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'password_mutable',
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

            it('Sign-in with the old password after direct reset should fail.', async () => {
                const response = await app.request(
                    '/api/auth/sign-in/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'password_mutable',
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

            it('Restore original password after test.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_PASSWORD_MUTABLE',
                            newPassword: 'P@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
            })

            it('Direct password reset for a user without credential account should return 404.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_NO_CREDENTIAL',
                            newPassword: 'N3wP@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(404)
                expect(responseData.error.code).toBe(
                    'ACCOUNT_CREDENTIAL_NOT_FOUND',
                )
            })
        })

        describe('Full Password Reset Flow (OTP Interception)', () => {
            let interceptedToken: string

            beforeAll(async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_PASSWORD_MUTABLE',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data).toBeNull()

                interceptedToken = await interceptPasswordResetToken(
                    'USER_PASSWORD_MUTABLE',
                )
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
                    '/api/auth/sign-in/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'password_mutable',
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
                    '/api/auth/sign-in/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'password_mutable',
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
                 * Use admin direct reset to restore the original password
                 * so other tests are not affected.
                 */
                const response = await app.request(
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_PASSWORD_MUTABLE',
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
