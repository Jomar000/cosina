import type { TApiResponseError, TApiResponseOk } from '@hyperion/types/shared'
import { beforeAll, describe, expect, it } from 'vitest'

import app from '../../../../src/core/app.js'
import {
    interceptPasswordResetToken,
    setTestingCookies,
} from '../../../utilities.js'

let privilegedCookie: string
let standardCookie: string

beforeAll(async () => {
    ;[
        privilegedCookie,
        standardCookie,
    ] = await setTestingCookies()
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
    describe.concurrent('Concurrent Tests', () => {
        /**
         * @description
         * Authentication & Authorization Guard
         */
        describe('Authentication & Authorization Guard', () => {
            it('Unauthenticated request to /reset-request should return 401.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: 'USER_003',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

                expect(response.status).toBe(401)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.code).toBe('UNAUTHORIZED')
            })

            it('Unauthenticated request to /reset should return 401.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            userId: 'USER_003',
                            newPassword: 'N3wP@ssw0rd1234',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

                expect(response.status).toBe(401)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.code).toBe('UNAUTHORIZED')
            })

            it('Non-admin request to /reset-request should return 403.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_003',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

                expect(response.status).toBe(403)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.code).toBe('FORBIDDEN')
            })

            it('Non-admin request to /reset should return 403.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_003',
                            newPassword: 'N3wP@ssw0rd1234',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

                expect(response.status).toBe(403)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.code).toBe('FORBIDDEN')
            })
        })

        /**
         * @description
         * Validation
         */
        describe('Validation', () => {
            it('Reset request with missing userId should return 400.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({}),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Reset with missing userId should return 400.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            newPassword: 'N3wP@ssw0rd1234',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Reset with missing newPassword should return 400.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_003',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Reset with weak newPassword should return 400.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_003',
                            newPassword: 'weak',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })
        })

        /**
         * @description
         * Reset Request Validations
         */
        describe('Reset Request Validations', () => {
            it('Reset request for a non-existent user should return 404.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'NONEXISTENT_USER',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

                expect(response.status).toBe(404)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe('User ID not found.')
            })
        })

        /**
         * @description
         * Direct Reset Validations
         */
        describe('Direct Reset Validations', () => {
            it('Direct reset for a non-existent user should return 404.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'NONEXISTENT_USER',
                            newPassword: 'N3wP@ssw0rd1234',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

                expect(response.status).toBe(404)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe('User ID not found.')
            })
        })
    })

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
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_003',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseOk<null>

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
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_003',
                            newPassword: 'N3wP@ssw0rd1234',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseOk<null>

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data).toBeNull()
            })

            it('Sign-in with the new password after direct reset should pass.', async () => {
                const response = await app.request(
                    '/api/auth/sign-in/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'member',
                            password: 'N3wP@ssw0rd1234',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseOk<unknown>

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
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'member',
                            password: 'P@ssw0rd1234',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

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
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_003',
                            newPassword: 'P@ssw0rd1234',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseOk<null>

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
            })
        })

        /**
         * @description
         * Full Password Reset Flow
         *
         * Simulates the complete admin-initiated password reset process:
         * 1. Admin triggers reset-request and intercepts the token from KV
         * 2. Use the token to complete the password reset via auth endpoint
         * 3. Verify sign-in with the new password
         *
         * The reset request and token interception are performed in
         * `beforeAll()` so the KV write persists across all `it()` blocks
         * within this `describe()` in the current Vitest process.
         */
        describe('Full Password Reset Flow (OTP Interception)', () => {
            let interceptedToken: string

            beforeAll(async () => {
                const response = await app.request(
                    '/api/admin/user/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_002',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseOk<null>

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data).toBeNull()

                interceptedToken = await interceptPasswordResetToken('USER_002')
                expect(interceptedToken).toBeTruthy()
            })

            it('Step 1: Complete password reset using the intercepted token.', async () => {
                const response = await app.request('/api/auth/password/reset', {
                    method: 'POST',
                    headers: {
                        origin: 'http://localhost:5175',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: interceptedToken,
                        newPassword: 'R3set@P@ssw0rd5678',
                    }),
                })

                const responseData =
                    (await response.json()) as TApiResponseOk<null>

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
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'administrator',
                            password: 'R3set@P@ssw0rd5678',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseOk<unknown>

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
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'administrator',
                            password: 'P@ssw0rd1234',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseError

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
                            origin: 'http://localhost:5175',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            userId: 'USER_002',
                            newPassword: 'P@ssw0rd1234',
                        }),
                    },
                )

                const responseData =
                    (await response.json()) as TApiResponseOk<null>

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
            })
        })
    })
})
