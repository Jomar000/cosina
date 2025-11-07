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

describe('Auth Endpoint', () => {
    it('Sign-in with valid credentials should pass.', async () => {
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

    it('Sign-in with missing Organization ID should fail.', async () => {
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

    it('Sign-in with invalid Organization ID should fail.', async () => {
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
})
