import type { TApiResponseError } from '@hyperion/types/shared'
import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import app from '../../../../src/core/index.js'
import { seedTestingCookies } from '../../../utilities.js'

let privilegedCookie: string
let standardCookie: string

beforeAll(async () => {
    ;[
        privilegedCookie,
        standardCookie,
    ] = await seedTestingCookies()
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

describe.concurrent('Admin User Password Endpoint', () => {
    describe.concurrent('Concurrent Tests', () => {
        /**
         * @description
         * Authentication & Authorization Guard
         */
        describe.concurrent('Authentication & Authorization Guard', () => {
            it('Unauthenticated request to /resetRequest should return 401.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/resetRequest',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
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
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
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

            it('Non-admin request to /resetRequest should return 403.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/resetRequest',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
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
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
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
        describe.concurrent('Validation', () => {
            it('Reset request with missing userId should return 400.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/resetRequest',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
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
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
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
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
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
                    '/api/admin/user/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
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
         * Reset Request Validations
         */
        describe.concurrent('Reset Request Validations', () => {
            it('Reset request for a non-existent user should return 404.', async () => {
                const response = await app.request(
                    '/api/admin/user/password/resetRequest',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
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

                expect(response.status).toBe(404)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe('User ID not found.')
            })
        })

        /**
         * @description
         * Direct Reset Validations
         */
        describe.concurrent('Direct Reset Validations', () => {
            it('Direct reset for a non-existent user should return 404.', async () => {
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
                            userId: 'NONEXISTENT_USER',
                            newPassword: 'N3wP@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(404)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe('User ID not found.')
            })
        })
    })
})
