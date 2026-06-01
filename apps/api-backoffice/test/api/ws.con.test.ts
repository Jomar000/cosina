import type { TApiResponseError } from '@hyperion/types/shared'
import { beforeAll, describe, expect, it } from 'vitest'

import wsHandler from '../../src/core/nitro/ws.js'
import app from '../../src/core/app.js'
import { setTestingCookies } from '../utilities.js'

type TWebSocketUpgradeResult = {
    context?: {
        canBroadcast?: boolean
    }
    headers?: Record<string, string>
    namespace?: string
}

type TWebSocketHooks = {
    upgrade?: (
        request: Request,
    ) => Promise<TWebSocketUpgradeResult> | TWebSocketUpgradeResult
}

type TNitroWebSocketHandler = {
    fetch(request: Request): Promise<Response> | Response
}

type TNitroWebSocketResponse = Response & {
    crossws?: TWebSocketHooks
}

const nitroWsHandler = wsHandler as TNitroWebSocketHandler
const wsUrl = 'http://localhost/api/ws/general'

let privilegedCookie: string
let standardCookie: string

beforeAll(async () => {
    ;[
        privilegedCookie,
        standardCookie,
    ] = await setTestingCookies()
})

const createUpgradeRequest = (headers: HeadersInit = {}) => {
    return new Request(wsUrl, {
        method: 'GET',
        headers,
    })
}

const runNitroUpgrade = async (
    request: Request,
): Promise<Response | TWebSocketUpgradeResult> => {
    const handlerResponse = (await nitroWsHandler.fetch(
        request,
    )) as TNitroWebSocketResponse
    const upgrade = handlerResponse.crossws?.upgrade

    expect(upgrade).toBeTypeOf('function')

    if (!upgrade) {
        throw new Error('Nitro websocket upgrade hook is not registered.')
    }

    try {
        return await upgrade(request)
    } catch (error) {
        if (error instanceof Response) {
            return error
        }

        throw error
    }
}

const expectNitroUpgradeError = async (
    request: Request,
    status: number,
    code: string,
    message?: string,
) => {
    const result = await runNitroUpgrade(request)

    expect(result).toBeInstanceOf(Response)

    const response = result as Response
    const responseData = (await response.json()) as TApiResponseError

    expect(response.status).toBe(status)
    expect(responseData).toHaveProperty('error')
    expect(responseData.error.code).toBe(code)

    if (message) {
        expect(responseData.error.message).toBe(message)
    }
}

const expectNitroUpgradeAccepted = async (request: Request) => {
    const result = await runNitroUpgrade(request)

    expect(result).not.toBeInstanceOf(Response)

    return result as TWebSocketUpgradeResult
}

const expectNitroRouteError = async (
    path: string,
    status: number,
    code: string,
) => {
    const response = (await nitroWsHandler.fetch(
        new Request(`http://localhost${path}`, {
            method: 'GET',
            headers: {
                origin: 'http://localhost:5175',
                cookie: privilegedCookie,
                upgrade: 'websocket',
            },
        }),
    )) as Response
    const responseData = (await response.json()) as TApiResponseError

    expect(response.status).toBe(status)
    expect(responseData.error.code).toBe(code)
}

describe('WebSocket Endpoint', () => {
    describe.concurrent('Concurrent Tests', () => {
        /**
         * @description
         * Nitro Ownership
         *
         * Hono does not own websocket upgrades. The channel is registered by
         * Nitro's websocket route map and exercised through the Nitro handler.
         */
        describe('Nitro Ownership', () => {
            it('Hono should not mount the websocket channel.', async () => {
                const response = await app.request('/api/ws/general', {
                    method: 'GET',
                    headers: {
                        origin: 'http://localhost:5175',
                        cookie: privilegedCookie,
                        upgrade: 'websocket',
                    },
                })

                expect(response.status).toBe(404)
            })

            it('Nitro should filter unregistered websocket channels.', async () => {
                await expectNitroRouteError(
                    '/api/ws/nonexistent-channel',
                    404,
                    'NOT_FOUND',
                )
            })
        })

        /**
         * @description
         * Authentication Guard
         */
        describe('Authentication Guard', () => {
            it('Unauthenticated request should return 401.', async () => {
                await expectNitroUpgradeError(
                    createUpgradeRequest({
                        origin: 'http://localhost:5175',
                        upgrade: 'websocket',
                    }),
                    401,
                    'UNAUTHORIZED',
                )
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
                await expectNitroUpgradeError(
                    createUpgradeRequest({
                        origin: 'http://localhost:5175',
                        cookie: privilegedCookie,
                    }),
                    426,
                    'WEBSOCKET_UPGRADE_REQUIRED',
                    'Expected Upgrade: websocket',
                )
            })

            it('Request with incorrect Upgrade value should return 426.', async () => {
                await expectNitroUpgradeError(
                    createUpgradeRequest({
                        origin: 'http://localhost:5175',
                        cookie: privilegedCookie,
                        upgrade: 'h2c',
                    }),
                    426,
                    'WEBSOCKET_UPGRADE_REQUIRED',
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
         * - Nitro accepts the websocket upgrade and stores broadcast
         *   permission in the peer context.
         */
        describe('Permission Guard', () => {
            it('Owner (ws.broadcast + ws.listen) connecting should be accepted by Nitro.', async () => {
                const upgrade = await expectNitroUpgradeAccepted(
                    createUpgradeRequest({
                        origin: 'http://localhost:5175',
                        cookie: privilegedCookie,
                        upgrade: 'websocket',
                    }),
                )

                expect(upgrade).toMatchObject({
                    context: {
                        canBroadcast: true,
                    },
                    headers: {
                        'X-WS-Can-Broadcast': 'true',
                    },
                    namespace: 'ws:general',
                })
            })

            it('Member (ws.listen only) connecting should be accepted by Nitro.', async () => {
                const upgrade = await expectNitroUpgradeAccepted(
                    createUpgradeRequest({
                        origin: 'http://localhost:5175',
                        cookie: standardCookie,
                        upgrade: 'websocket',
                    }),
                )

                expect(upgrade).toMatchObject({
                    context: {
                        canBroadcast: false,
                    },
                    headers: {
                        'X-WS-Can-Broadcast': 'false',
                    },
                    namespace: 'ws:general',
                })
            })

            it('Admin (ws.broadcast + ws.listen) connecting should be accepted by Nitro.', async () => {
                const signInResponse = await app.request(
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

                const adminCookie = signInResponse.headers
                    .getSetCookie()
                    .join('; ')

                const upgrade = await expectNitroUpgradeAccepted(
                    createUpgradeRequest({
                        origin: 'http://localhost:5175',
                        cookie: adminCookie,
                        upgrade: 'websocket',
                    }),
                )

                expect(upgrade).toMatchObject({
                    context: {
                        canBroadcast: true,
                    },
                    headers: {
                        'X-WS-Can-Broadcast': 'true',
                    },
                    namespace: 'ws:general',
                })
            })
        })
    })
})
