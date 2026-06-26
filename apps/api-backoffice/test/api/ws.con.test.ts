import type { TApiResponseError } from '@hyperion/types/shared'
import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../../src/core/index.js'
import { seedTestingCookies } from '../utilities.js'

let privilegedCookie: string
let standardCookie: string
let administratorCookie: string

beforeAll(async () => {
    ;[
        privilegedCookie,
        standardCookie,
        administratorCookie,
    ] = await seedTestingCookies()
})

describe.concurrent('WebSocket Endpoint', () => {
    describe.concurrent('Concurrent Tests', () => {
        /**
         * @description
         * Authentication Guard
         *
         * isAuthorized() middleware wraps isAuthenticated() and runs before all route logic.
         */
        describe.concurrent('Authentication Guard', () => {
            it('Unauthenticated request should return 401.', async () => {
                const response = await app.request(
                    '/api/ws/general',
                    {
                        method: 'GET',
                        headers: {
                            origin: env.URL_FRONTEND,
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
        describe.concurrent('Unregistered Channel', () => {
            it('Request to an unregistered channel should return 404.', async () => {
                const response = await app.request(
                    '/api/ws/nonexistent-channel',
                    {
                        method: 'GET',
                        headers: {
                            origin: env.URL_FRONTEND,
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
        describe.concurrent('WebSocket Upgrade Guard', () => {
            it('Request without Upgrade header should return 426.', async () => {
                const response = await app.request(
                    '/api/ws/general',
                    {
                        method: 'GET',
                        headers: {
                            origin: env.URL_FRONTEND,
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
                            origin: env.URL_FRONTEND,
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
         * WebSocket Origin Guard
         *
         * WebSocket upgrade requests must come from the configured frontend origin.
         */
        describe.concurrent('WebSocket Origin Guard', () => {
            it('Request without Origin header should return 400.', async () => {
                const response = await app.request(
                    '/api/ws/general',
                    {
                        method: 'GET',
                        headers: {
                            cookie: privilegedCookie,
                            upgrade: 'websocket',
                        },
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.code).toBe('BAD_REQUEST')
                expect(responseData.error.message).toBe(
                    'Missing Origin request header.',
                )
            })

            it('Request with invalid Origin header should return 403.', async () => {
                const response = await app.request(
                    '/api/ws/general',
                    {
                        method: 'GET',
                        headers: {
                            origin: 'https://example.invalid',
                            cookie: privilegedCookie,
                            upgrade: 'websocket',
                        },
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(403)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.code).toBe('FORBIDDEN')
                expect(responseData.error.message).toBe(
                    'Invalid request origin.',
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
        describe.concurrent('Permission Guard', () => {
            it('Owner (ws.broadcast + ws.listen) connecting should return 101.', async () => {
                const response = await app.request(
                    '/api/ws/general',
                    {
                        method: 'GET',
                        headers: {
                            origin: env.URL_FRONTEND,
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
                            origin: env.URL_FRONTEND,
                            cookie: standardCookie,
                            upgrade: 'websocket',
                        },
                    },
                    env,
                )

                expect(response.status).toBe(101)
            })

            it('Admin (ws.broadcast + ws.listen) connecting should return 101.', async () => {
                const response = await app.request(
                    '/api/ws/general',
                    {
                        method: 'GET',
                        headers: {
                            origin: env.URL_FRONTEND,
                            cookie: administratorCookie,
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
