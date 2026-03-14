import type { TApiResponseError } from '@hyperion/types/shared'
import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import app from '../../src/core/index.js'
import { setTestingCookies } from '../utilities.js'

let privilegedCookie: string
let standardCookie: string

beforeAll(async () => {
    ;[
        privilegedCookie,
        standardCookie,
    ] = await setTestingCookies()
})

describe('WebSocket Endpoint', () => {
    /**
     * @description
     * Authentication Guard
     *
     * isAuthenticated() middleware runs before all route logic.
     */
    describe('Authentication Guard', () => {
        it('Unauthenticated request should return 401.', async () => {
            const response = await app.request(
                '/app/ws/test-channel',
                {
                    method: 'GET',
                    headers: {
                        origin: 'vitest-pool-worker',
                        upgrade: 'websocket',
                    },
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(401)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.code).toBe('UNAUTHORIZED')
        })
    })

    /**
     * @description
     * Channel Validation
     *
     * Channel name must be between 1 and 32 characters.
     */
    describe('Channel Validation', () => {
        it('Channel name exceeding 32 characters should return 400.', async () => {
            const response = await app.request(
                '/app/ws/this-channel-name-exceeds-32-chars',
                {
                    method: 'GET',
                    headers: {
                        origin: 'vitest-pool-worker',
                        cookie: privilegedCookie,
                        upgrade: 'websocket',
                    },
                },
                env,
            )

            expect(response.status).toBe(400)
        })
    })

    /**
     * @description
     * WebSocket Upgrade Guard
     *
     * Request must include a valid `Upgrade: websocket` header.
     */
    describe('WebSocket Upgrade Guard', () => {
        it('Request without Upgrade header should return 426.', async () => {
            const response = await app.request(
                '/app/ws/test-channel',
                {
                    method: 'GET',
                    headers: {
                        origin: 'vitest-pool-worker',
                        cookie: privilegedCookie,
                    },
                },
                env,
            )

            expect(response.status).toBe(426)
        })

        it('Request with incorrect Upgrade value should return 426.', async () => {
            const response = await app.request(
                '/app/ws/test-channel',
                {
                    method: 'GET',
                    headers: {
                        origin: 'vitest-pool-worker',
                        cookie: privilegedCookie,
                        upgrade: 'h2c',
                    },
                },
                env,
            )

            expect(response.status).toBe(426)
        })
    })

    /**
     * @description
     * Permission Guard & WebSocket Connection
     *
     * - Owners and admins receive ws.broadcast + ws.listen.
     * - Members receive ws.listen only.
     * - Both roles should successfully upgrade to WebSocket (101).
     */
    describe('Permission Guard', () => {
        it('Owner (ws.broadcast + ws.listen) connecting should return 101.', async () => {
            const response = await app.request(
                '/app/ws/test-channel',
                {
                    method: 'GET',
                    headers: {
                        origin: 'vitest-pool-worker',
                        cookie: privilegedCookie,
                        upgrade: 'websocket',
                    },
                },
                env,
            )

            expect(response.status).toBe(101)
        })

        it('Member (ws.listen only) connecting should return 101.', async () => {
            const response = await app.request(
                '/app/ws/test-channel',
                {
                    method: 'GET',
                    headers: {
                        origin: 'vitest-pool-worker',
                        cookie: standardCookie,
                        upgrade: 'websocket',
                    },
                },
                env,
            )

            expect(response.status).toBe(101)
        })

        it('Admin (ws.broadcast + ws.listen) connecting should return 101.', async () => {
            const signInResponse = await app.request(
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

            const adminCookie = signInResponse.headers.getSetCookie().join('; ')

            const response = await app.request(
                '/app/ws/test-channel',
                {
                    method: 'GET',
                    headers: {
                        origin: 'vitest-pool-worker',
                        cookie: adminCookie,
                        upgrade: 'websocket',
                    },
                },
                env,
            )

            expect(response.status).toBe(101)
        })
    })
})
