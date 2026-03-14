import type { TApiResponseError, TApiResponseOk } from '@hyperion/types/shared'
import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import app from '../../../../src/core/index.js'
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
 * Route: /app/admin/user/password
 *
 * Test accounts from seed data:
 * - USER_001 (superadministrator, owner) — privileged
 * - USER_002 (administrator, admin)
 * - USER_003 (member, member) — standard
 * - USER_999 (locked, member)
 */

describe('Admin User Password Endpoint', () => {
    /**
     * @description
     * Authentication & Authorization Guard
     */
    describe('Authentication & Authorization Guard', () => {
        it('Unauthenticated request to /reset-request should return 401.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset-request',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: 'USER_003',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(401)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.code).toBe('UNAUTHORIZED')
        })

        it('Unauthenticated request to /reset should return 401.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: 'USER_003',
                        newPassword: 'N3wP@ssw0rd1234',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(401)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.code).toBe('UNAUTHORIZED')
        })

        it('Non-admin request to /reset-request should return 403.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset-request',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: standardCookie,
                    },
                    body: JSON.stringify({
                        userId: 'USER_003',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(403)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.code).toBe('FORBIDDEN')
        })

        it('Non-admin request to /reset should return 403.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: standardCookie,
                    },
                    body: JSON.stringify({
                        userId: 'USER_003',
                        newPassword: 'N3wP@ssw0rd1234',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

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
                '/app/admin/user/password/reset-request',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({}),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(400)
            expect(responseData).toHaveProperty('error')
        })

        it('Reset with missing userId should return 400.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        newPassword: 'N3wP@ssw0rd1234',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(400)
            expect(responseData).toHaveProperty('error')
        })

        it('Reset with missing newPassword should return 400.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        userId: 'USER_003',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(400)
            expect(responseData).toHaveProperty('error')
        })

        it('Reset with weak newPassword should return 400.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        userId: 'USER_003',
                        newPassword: 'weak',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(400)
            expect(responseData).toHaveProperty('error')
        })
    })

    /**
     * @description
     * Reset Request (Email OTP Flow)
     */
    describe('Reset Request', () => {
        it('Reset request for a valid organization member should pass.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset-request',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        userId: 'USER_003',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseOk<null>>()

            expect(response.status).toBe(200)
            expect(responseData.success).toBe(true)
            expect(responseData.data).toBeNull()
        })

        it('Reset request for a non-existent user should return 400.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset-request',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        userId: 'NONEXISTENT_USER',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(400)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.message).toBe('User ID not found.')
        })
    })

    /**
     * @description
     * Direct Reset (Admin sets password directly)
     */
    describe('Direct Reset', () => {
        it('Direct password reset for a valid organization member should pass.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        userId: 'USER_003',
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

        it('Sign-in with the new password after direct reset should pass.', async () => {
            const response = await app.request(
                '/app/auth/sign-in/username',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        organizationId: 'superorganization',
                        accountId: 'member',
                        password: 'N3wP@ssw0rd1234',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseOk<unknown>>()

            expect(response.status).toBe(200)
            expect(response.headers.get('set-cookie')).toBeTruthy()
            expect(responseData).toHaveProperty('data')
        })

        it('Sign-in with the old password after direct reset should fail.', async () => {
            const response = await app.request(
                '/app/auth/sign-in/username',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        organizationId: 'superorganization',
                        accountId: 'member',
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

        it('Direct reset for a non-existent user should return 400.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        userId: 'NONEXISTENT_USER',
                        newPassword: 'N3wP@ssw0rd1234',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(400)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.message).toBe('User ID not found.')
        })

        it('Restore original password after test.', async () => {
            const response = await app.request(
                '/app/admin/user/password/reset',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        userId: 'USER_003',
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
     * Full Password Reset Flow
     *
     * Simulates the complete admin-initiated password reset process:
     * 1. Admin triggers reset-request and intercepts the token from KV
     * 2. Use the token to complete the password reset via auth endpoint
     * 3. Verify sign-in with the new password
     *
     * The reset request and token interception are performed in
     * `beforeAll()` so the KV write persists across all `it()` blocks
     * within this `describe()`. Storage isolation is per test file
     * (see @cloudflare/vitest-pool-workers v0.13.0).
     */
    describe('Full Password Reset Flow (OTP Interception)', () => {
        let interceptedToken: string

        beforeAll(async () => {
            const response = await app.request(
                '/app/admin/user/password/reset-request',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        userId: 'USER_002',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseOk<null>>()

            expect(response.status).toBe(200)
            expect(responseData.success).toBe(true)
            expect(responseData.data).toBeNull()

            interceptedToken = await interceptPasswordResetToken('USER_002')
            expect(interceptedToken).toBeTruthy()
        })

        it('Step 1: Complete password reset using the intercepted token.', async () => {
            const response = await app.request(
                '/app/auth/password/reset',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
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
                '/app/auth/sign-in/username',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        organizationId: 'superorganization',
                        accountId: 'administrator',
                        password: 'R3set@P@ssw0rd5678',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseOk<unknown>>()

            expect(response.status).toBe(200)
            expect(response.headers.get('set-cookie')).toBeTruthy()
            expect(responseData).toHaveProperty('data')
        })

        it('Step 3: Sign-in with the old password should fail.', async () => {
            const response = await app.request(
                '/app/auth/sign-in/username',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        organizationId: 'superorganization',
                        accountId: 'administrator',
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
                '/app/admin/user/password/reset',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        userId: 'USER_002',
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
