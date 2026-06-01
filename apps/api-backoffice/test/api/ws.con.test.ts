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
    describe.concurrent('Concurrent Tests', () => {
        /**
         * @description
         * Authentication Guard
         *
         * isAuthorized() middleware wraps isAuthenticated() and runs before all route logic.
         */
        describe('Authentication Guard', () => {
            it('Unauthenticated request should return 401.', async () => {
                const response = await app.request(
                    '/api/ws/general',
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
         * Unregistered Channel
         *
         * Channels are statically registered via createWsChannel factory.
         * Requests to unregistered channels should return 404.
         */
        describe('Unregistered Channel', () => {
            it('Request to an unregistered channel should return 404.', async () => {
                const response = await app.request(
                    '/api/ws/nonexistent-channel',
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

                expect(response.status).toBe(404)
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
                    '/api/ws/general',
                    {
                        method: 'GET',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(426)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.code).toBe(
                    'WEBSOCKET_UPGRADE_REQUIRED',
                )
                expect(responseData.error.message).toBe(
                    'Expected Upgrade: websocket',
                )
            })

            it('Request with incorrect Upgrade value should return 426.', async () => {
                const response = await app.request(
                    '/api/ws/general',
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

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(426)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.code).toBe(
                    'WEBSOCKET_UPGRADE_REQUIRED',
                )
                expect(responseData.error.message).toBe(
                    'Expected Upgrade: websocket',
                )
            })
        })

        /**
         * @description
         * Permission Guard & WebSocket Connection
         *
         * - Owners and admins receive ws.broadcast + ws.listen.
         * - Members receive ws.listen only.
         * - All roles with ws.listen should successfully upgrade to WebSocket (101).
         */
        describe('Permission Guard', () => {
            it('Owner (ws.broadcast + ws.listen) connecting should return 101.', async () => {
                const response = await app.request(
                    '/api/ws/general',
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
                    '/api/ws/general',
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

                const adminCookie = signInResponse.headers
                    .getSetCookie()
                    .join('; ')

                const response = await app.request(
                    '/api/ws/general',
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
})
