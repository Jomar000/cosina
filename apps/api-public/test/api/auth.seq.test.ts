import { dbClient, dbSchema } from '@hyperion/database/postgres'
import type { TApiResponseError, TApiResponseOk } from '@hyperion/types/shared'
import { env } from 'cloudflare:workers'
import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'

import app from '../../src/core/index.js'
import { interceptPasswordResetToken, setTestingCookies } from '../utilities.js'

let privilegedCookie: string // eslint-disable-line @typescript-eslint/no-unused-vars
let standardCookie: string

type TSignInResponseData = {
    userRoles: string[]
}

const getDb = () =>
    dbClient({
        host: env.HYPERIONPUB_HD.host,
        port: Number(env.HYPERIONPUB_HD.port) || 5432,
        database: env.HYPERIONPUB_HD.database,
        user: env.HYPERIONPUB_HD.user,
        pass: env.HYPERIONPUB_HD.password,
    })

const restoreAdministratorAttribute = async () => {
    const db = getDb()
    const { userAttribute } = dbSchema

    try {
        await db
            .delete(userAttribute)
            .where(eq(userAttribute.userId, 'USER_002'))
        await db.insert(userAttribute).values({
            userId: 'USER_002',
            isLocked: false,
        })
    } finally {
        await db.$client.end()
    }
}

const signInAdministrator = async () => {
    const response = await app.request(
        '/api/auth/sign-in/username',
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

    expect(response.status).toBe(200)

    return response.headers.getSetCookie().join('; ')
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

describe('Auth Endpoint', () => {
    describe.concurrent('Concurrent Tests', () => {
        describe('Sign-in', () => {
            describe('Username', () => {
                it('Sign-in with valid credentials should pass.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/username',
                        {
                            method: 'POST',
                            headers: {
                                origin: 'vitest-pool-worker',
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
                        await response.json<TApiResponseOk<unknown>>()

                    expect(response.status).toBe(200)
                    expect(response.headers.get('set-cookie')).toBeTruthy()
                    expect(responseData).toHaveProperty('data')
                })

                it('Sign-in with missing Organization ID should fail.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/username',
                        {
                            method: 'POST',
                            headers: {
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                        'homeowner',
                        'board_member',
                    ])
                })
            })

            describe('E-mail', () => {
                it('Sign-in with valid credentials should pass.', async () => {
                    const response = await app.request(
                        '/api/auth/sign-in/email',
                        {
                            method: 'POST',
                            headers: {
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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

        describe('Sign-out', () => {
            it('Sign-out with valid session should pass.', async () => {
                // Sign in first to get a session cookie
                const signInResponse = await app.request(
                    '/api/auth/sign-in/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
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
                            origin: 'vitest-pool-worker',
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
            })
        })

        describe('Password Change Validation', () => {
            it('Unauthenticated request should return 401.', async () => {
                const response = await app.request(
                    '/api/auth/password/change',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
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
                            origin: 'vitest-pool-worker',
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
                            origin: 'vitest-pool-worker',
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
                            origin: 'vitest-pool-worker',
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
                            origin: 'vitest-pool-worker',
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

        describe('Password Reset Request', () => {
            it('Missing email should return 400.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
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
                            origin: 'vitest-pool-worker',
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
                            origin: 'vitest-pool-worker',
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
                            origin: 'vitest-pool-worker',
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

        describe('Password Reset Validation', () => {
            it('Missing token should return 400.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
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
                            origin: 'vitest-pool-worker',
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
                            origin: 'vitest-pool-worker',
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
                            origin: 'vitest-pool-worker',
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

    describe('Sequential Tests', () => {
        describe('User Attribute Lock Enforcement', () => {
            it('Sign-in by username with missing user attribute should fail closed.', async () => {
                await restoreAdministratorAttribute()

                const db = getDb()
                const { userAttribute } = dbSchema

                try {
                    await db
                        .delete(userAttribute)
                        .where(eq(userAttribute.userId, 'USER_002'))

                    const response = await app.request(
                        '/api/auth/sign-in/username',
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

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(423)
                    expect(responseData.error.code).toBe('LOCKED')
                    expect(responseData.error.message).toBe(
                        'Account is currently locked.',
                    )
                } finally {
                    await db.$client.end()
                    await restoreAdministratorAttribute()
                }
            })

            it('Sign-in by email with missing user attribute should fail closed.', async () => {
                await restoreAdministratorAttribute()

                const db = getDb()
                const { userAttribute } = dbSchema

                try {
                    await db
                        .delete(userAttribute)
                        .where(eq(userAttribute.userId, 'USER_002'))

                    const response = await app.request(
                        '/api/auth/sign-in/email',
                        {
                            method: 'POST',
                            headers: {
                                origin: 'vitest-pool-worker',
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                organizationId: 'superorganization',
                                accountId: 'administrator@hyperion.app',
                                password: 'P@ssw0rd1234',
                            }),
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
                } finally {
                    await db.$client.end()
                    await restoreAdministratorAttribute()
                }
            })

            it('Authenticated session should fail after user is locked.', async () => {
                await restoreAdministratorAttribute()

                const [
                    firstSessionCookie,
                    secondSessionCookie,
                ] = await Promise.all([
                    signInAdministrator(),
                    signInAdministrator(),
                ])
                const db = getDb()
                const { userAttribute } = dbSchema

                try {
                    await db
                        .update(userAttribute)
                        .set({ isLocked: true })
                        .where(eq(userAttribute.userId, 'USER_002'))

                    const response = await app.request(
                        '/api/user/profile/read',
                        {
                            method: 'GET',
                            headers: {
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                    await db.$client.end()
                    await restoreAdministratorAttribute()
                }
            })

            it('Authenticated session should fail after user attribute is removed.', async () => {
                await restoreAdministratorAttribute()

                const [
                    firstSessionCookie,
                    secondSessionCookie,
                ] = await Promise.all([
                    signInAdministrator(),
                    signInAdministrator(),
                ])
                const db = getDb()
                const { userAttribute } = dbSchema

                try {
                    await db
                        .delete(userAttribute)
                        .where(eq(userAttribute.userId, 'USER_002'))

                    const response = await app.request(
                        '/api/user/profile/read',
                        {
                            method: 'GET',
                            headers: {
                                origin: 'vitest-pool-worker',
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
                                origin: 'vitest-pool-worker',
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
                    await db.$client.end()
                    await restoreAdministratorAttribute()
                }
            })
        })

        /**
         * @description
         * Password Change Flow
         */
        describe('Password Change Flow', () => {
            it('Valid password change should pass.', async () => {
                const response = await app.request(
                    '/api/auth/password/change',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
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
                    '/api/auth/sign-in/username',
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

                const responseData =
                    await response.json<TApiResponseOk<unknown>>()

                expect(response.status).toBe(200)
                expect(response.headers.get('set-cookie')).toBeTruthy()
                expect(responseData).toHaveProperty('data')
            })

            it('Sign-in with the old password should fail.', async () => {
                const response = await app.request(
                    '/api/auth/sign-in/username',
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

            it('Restore original password.', async () => {
                /**
                 * @description
                 * Sign in with new password to get a fresh session,
                 * then change back to original.
                 */
                const signInResponse = await app.request(
                    '/api/auth/sign-in/username',
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

                const freshCookie = signInResponse.headers
                    .getSetCookie()
                    .join('; ')

                const response = await app.request(
                    '/api/auth/password/change',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
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
         * within this `describe()`. Storage isolation is per test file
         * (see @cloudflare/vitest-pool-workers v0.13.0).
         */
        describe('Full Password Reset Flow (Token Interception)', () => {
            let interceptedToken: string

            beforeAll(async () => {
                const response = await app.request(
                    '/api/auth/password/reset-request',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
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

                interceptedToken = await interceptPasswordResetToken('USER_003')
                expect(interceptedToken).toBeTruthy()
            })

            it('Step 1: Complete password reset using the intercepted token.', async () => {
                const response = await app.request(
                    '/api/auth/password/reset',
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
                    '/api/auth/sign-in/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'member',
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

            it('Step 4: Restore original password.', async () => {
                /**
                 * @description
                 * Sign in with new password to get a fresh session,
                 * then use password change to restore original.
                 */
                const signInResponse = await app.request(
                    '/api/auth/sign-in/username',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                        },
                        body: JSON.stringify({
                            organizationId: 'superorganization',
                            accountId: 'member',
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
                            origin: 'vitest-pool-worker',
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
