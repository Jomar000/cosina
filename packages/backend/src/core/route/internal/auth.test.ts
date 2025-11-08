import type { authSignInOutputSchema } from '@hyperion/validator/internal/auth'
import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import type z from 'zod'

import app from '../../index.js'

type TDataOutput = Extract<
    z.output<typeof authSignInOutputSchema>,
    { data: unknown }
>

type TErrorOutput = Extract<
    z.output<typeof authSignInOutputSchema>,
    { error: unknown }
>

/**
 * @description
 * Some marked tests trigger a false-positive unhandled rejection error.
 * Handled by the event listeners defined on vitest.setup.ts
 */

describe('Auth Endpoint', () => {
    it('[username] Sign-in with valid credentials should pass.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/username?organizationId=superorganization',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'superadministrator',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        )

        const responseData = await response.json<TDataOutput>()

        expect(response.status).toBe(200)
        expect(response.headers.get('set-cookie')).toBeTruthy()
        expect(responseData).toHaveProperty('data')
    })

    it('[username] Sign-in with missing Organization ID should fail.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/username',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'superadministrator',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        )

        const responseData = await response.json<TErrorOutput>()

        expect(response.status).toBe(400)
        expect(responseData).toHaveProperty('error')
        expect(responseData.error.message).toBe(
            'Organization ID was not provided.',
        )
    })

    it('[username] Sign-in with invalid Organization ID should fail.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/username?organizationId=INVALID',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'superadministrator',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        )

        const responseData = await response.json<TErrorOutput>()

        expect(response.status).toBe(422)
        expect(responseData).toHaveProperty('error')
        expect(responseData.error.message).toBe('Invalid credentials provided.')
    })

    it('[username] Sign-in with invalid username should fail.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/username?organizationId=superorganization',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'INVALID',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        )

        const responseData = await response.json<TErrorOutput>()

        expect(response.status).toBe(422)
        expect(responseData).toHaveProperty('error')
        expect(responseData.error.message).toBe('Invalid credentials provided.')
    })

    // INFO: Unhandled Rejection Error
    it('[username] Sign-in with invalid password should fail.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/username?organizationId=superorganization',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'superadministrator',
                    password: 'INVALID',
                }),
            },
            env,
        )

        const responseData = await response.json<TErrorOutput>()

        expect(response.status).toBe(422)
        expect(responseData).toHaveProperty('error')
        expect(responseData.error.message).toBe('Invalid credentials provided.')
    })

    it('[username] Sign-in with locked account should fail.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/username?organizationId=superorganization',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'locked',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        )

        const responseData = await response.json<TErrorOutput>()

        expect(response.status).toBe(423)
        expect(responseData).toHaveProperty('error')
        expect(responseData.error.message).toBe('Account is currently locked.')
    })

    it('[email] Sign-in with valid credentials should pass.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/email?organizationId=superorganization',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'superadministrator@localhost.dev',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        )

        const responseData = await response.json<TDataOutput>()

        expect(response.status).toBe(200)
        expect(response.headers.get('set-cookie')).toBeTruthy()
        expect(responseData).toHaveProperty('data')
    })

    it('[email] Sign-in with missing Organization ID should fail.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/email',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'superadministrator@localhost.dev',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        )

        const responseData = await response.json<TErrorOutput>()

        expect(response.status).toBe(400)
        expect(responseData).toHaveProperty('error')
        expect(responseData.error.message).toBe(
            'Organization ID was not provided.',
        )
    })

    it('[email] Sign-in with invalid Organization ID should fail.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/email?organizationId=INVALID',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'superadministrator@localhost.dev',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        )

        const responseData = await response.json<TErrorOutput>()

        expect(response.status).toBe(422)
        expect(responseData).toHaveProperty('error')
        expect(responseData.error.message).toBe('Invalid credentials provided.')
    })

    it('[email] Sign-in with invalid e-mail should fail.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/email?organizationId=superorganization',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'INVALID@INVALID.invalid',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        )

        const responseData = await response.json<TErrorOutput>()

        expect(response.status).toBe(422)
        expect(responseData).toHaveProperty('error')
        expect(responseData.error.message).toBe('Invalid credentials provided.')
    })

    // INFO: Unhandled Rejection Error
    it('[email] Sign-in with invalid password should fail.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/email?organizationId=superorganization',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'superadministrator@localhost.dev',
                    password: 'INVALID',
                }),
            },
            env,
        )

        const responseData = await response.json<TErrorOutput>()

        expect(response.status).toBe(422)
        expect(responseData).toHaveProperty('error')
        expect(responseData.error.message).toBe('Invalid credentials provided.')
    })

    it('[email] Sign-in with locked account should fail.', async () => {
        const response = await app.request(
            '/internal/auth/sign-in/email?organizationId=superorganization',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'locked@localhost.dev',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        )

        const responseData = await response.json<TErrorOutput>()

        expect(response.status).toBe(423)
        expect(responseData).toHaveProperty('error')
        expect(responseData.error.message).toBe('Account is currently locked.')
    })
})
