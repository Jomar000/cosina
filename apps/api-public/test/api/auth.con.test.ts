import type { TApiResponseError, TApiResponseOk } from '@hyperion/types/shared'
import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import app from '../../src/core/index.js'
import { setTestingCookies } from '../utilities.js'

let privilegedCookie: string // eslint-disable-line @typescript-eslint/no-unused-vars
let standardCookie: string

type TSignInResponseData = {
    roles: Record<string, Record<string, string[]>>
    userRoles: string[]
}

beforeAll(async () => {
    ;[
        privilegedCookie,
        standardCookie,
    ] = await setTestingCookies()
})

/**
 * @description
 * Some marked tests trigger a false-positive unhandled rejection error.
 * Handled by the event listeners defined on vitest.setup.ts
 */

describe.concurrent('Auth Endpoint', () => {
    describe.concurrent('Concurrent Tests', () => {
        describe.concurrent('Sign-in', () => {
            describe.concurrent('Username', () => {
                it('Sign-in with valid credentials should pass.', async () => {
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
                                accountId: 'superadministrator',
                                password: 'P@ssw0rd1234',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<
                            TApiResponseOk<TSignInResponseData>
                        >()

                    expect(response.status).toBe(200)
                    expect(response.headers.get('set-cookie')).toBeTruthy()
                    expect(responseData).toHaveProperty('data')
                    expect(responseData.data.userRoles).toEqual(['owner'])
                    expect(Object.keys(responseData.data.roles)).toEqual([
                        'owner',
                    ])
                })

                it('Sign-in with missing Organization ID should fail.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/username',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                accountId: 'superadministrator',
                                password: 'P@ssw0rd1234',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(400)
                    expect(responseData).toHaveProperty('error')
                })

                it('Sign-in with invalid Organization ID should fail.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/username',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                organizationId: 'INVALID',
                                accountId: 'superadministrator',
                                password: 'P@ssw0rd1234',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(422)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.message).toBe(
                        'Invalid credentials provided.',
                    )
                })

                it('Sign-in with invalid username should fail.', async () => {
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
                                accountId: 'INVALID',
                                password: 'P@ssw0rd1234',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(422)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.message).toBe(
                        'Invalid credentials provided.',
                    )
                })

                it('Sign-in with invalid password should fail.', async () => {
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
                                accountId: 'superadministrator',
                                password: 'P@ssw0rd4321',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(422)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.message).toBe(
                        'Invalid credentials provided.',
                    )
                })

                it('Sign-in with weak password should fail.', async () => {
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
                                accountId: 'superadministrator',
                                password: 'weak',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(400)
                    expect(responseData).toHaveProperty('error')
                })

                it('Sign-in with locked account should fail.', async () => {
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
                                accountId: 'locked',
                                password: 'P@ssw0rd1234',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(423)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.message).toBe(
                        'Account is currently locked.',
                    )
                })

                it('Sign-in with multi-role membership should return parsed user roles.', async () => {
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
                                accountId: 'multirole',
                                password: 'P@ssw0rd1234',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<
                            TApiResponseOk<TSignInResponseData>
                        >()

                    expect(response.status).toBe(200)
                    expect(responseData.data.userRoles).toEqual([
                        'owner',
                        'admin',
                        'member',
                    ])
                    expect(Object.keys(responseData.data.roles)).toEqual([
                        'owner',
                        'admin',
                        'member',
                    ])
                })
            })

            describe.concurrent('E-mail', () => {
                it('Sign-in with valid credentials should pass.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/email',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                organizationId: 'superorganization',
                                accountId: 'superadministrator@hyperion.app',
                                password: 'P@ssw0rd1234',
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

                it('Sign-in with missing Organization ID should fail.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/email',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                accountId: 'superadministrator@hyperion.app',
                                password: 'P@ssw0rd1234',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(400)
                    expect(responseData).toHaveProperty('error')
                })

                it('Sign-in with invalid Organization ID should fail.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/email',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                organizationId: 'INVALID',
                                accountId: 'superadministrator@hyperion.app',
                                password: 'P@ssw0rd1234',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(422)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.message).toBe(
                        'Invalid credentials provided.',
                    )
                })

                it('Sign-in with invalid e-mail should fail.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/email',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                organizationId: 'superorganization',
                                accountId: 'INVALID@INVALID.invalid',
                                password: 'P@ssw0rd1234',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(422)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.message).toBe(
                        'Invalid credentials provided.',
                    )
                })

                it('Sign-in with invalid password should fail.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/email',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                organizationId: 'superorganization',
                                accountId: 'superadministrator@hyperion.app',
                                password: 'P@ssw0rd4321',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(422)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.message).toBe(
                        'Invalid credentials provided.',
                    )
                })

                it('Sign-in with weak password should fail.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/email',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                organizationId: 'superorganization',
                                accountId: 'superadministrator@hyperion.app',
                                password: 'weak',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(400)
                    expect(responseData).toHaveProperty('error')
                })

                it('Sign-in with locked account should fail.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/email',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                organizationId: 'superorganization',
                                accountId: 'locked@hyperion.app',
                                password: 'P@ssw0rd1234',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(423)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.message).toBe(
                        'Account is currently locked.',
                    )
                })
            })
        })

        describe.sequential('Sign-out', () => {
            it('Sign-out with valid session should pass.', async () => {
                // Sign in first to get a session cookie
                const signInResponse = await app.request(
                    '/api/auth/sign-in/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'superadministrator',
                            password: 'P@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const sessionCookie = signInResponse.headers
                    .getSetCookie()
                    .join('; ')

                const response = await app.request(
                    '/api/auth/sign-out',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            cookie: sessionCookie,
                        },
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(response.headers.get('set-cookie')).toBeTruthy()
                expect(responseData.success).toBe(true)
                expect(responseData.data).toBeNull()
            }, 20_000)
        })

        describe.concurrent('Password Change Validation', () => {
            it('Unauthenticated request should return 401.', async () => {
                const response = await app.request(
                    '/api/auth/password/change',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            currentPassword: 'P@ssw0rd1234',
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

            it('Missing currentPassword should return 400.', async () => {
                const response = await app.request(
                    '/api/auth/password/change',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: standardCookie,
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

            it('Missing newPassword should return 400.', async () => {
                const response = await app.request(
                    '/api/auth/password/change',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            currentPassword: 'P@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Weak newPassword should return 400.', async () => {
                const response = await app.request(
                    '/api/auth/password/change',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            currentPassword: 'P@ssw0rd1234',
                            newPassword: 'weak',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Incorrect currentPassword should return 422.', async () => {
                const response = await app.request(
                    '/api/auth/password/change',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            currentPassword: 'Wr0ng@P@ssw0rd99',
                            newPassword: 'N3wP@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(422)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe(
                    'Password change failed. Please verify your current password.',
                )
            })
        })

        describe.concurrent('Password Reset Request', () => {
            it('Missing email should return 400.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({}),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Invalid email format should return 400.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: 'not-an-email',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Valid email should return 200.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: 'member@hyperion.app',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseOk<null>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data).toBeNull()
            })

            it('Non-existent email should silently succeed with 200.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: 'nonexistent@hyperion.app',
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

        describe.concurrent('Password Reset Validation', () => {
            it('Missing token should return 400.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
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

            it('Missing newPassword should return 400.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            token: 'some-token-value',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Weak newPassword should return 400.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            token: 'some-token-value',
                            newPassword: 'weak',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Invalid token should return 422.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: env.URL_FRONTEND,
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            token: 'invalid-token-value-here',
                            newPassword: 'N3wP@ssw0rd1234',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(422)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe(
                    'Password reset failed. The token may be invalid or expired.',
                )
            })
        })
    })
})
