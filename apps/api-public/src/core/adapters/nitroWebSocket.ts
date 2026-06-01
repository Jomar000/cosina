import { dbClient, dbSchema } from '@hyperion/database/postgres'
import { defineWebSocketHandler } from 'nitro'

import { aclBuilder } from '../../auth/acl.js'
import { auth } from '../../auth/index.js'
import { getAppConfig, getDatabaseConfig, getKvClient } from './nitroRuntime.js'

const messagesTopic = 'messages'

type TNitroWebSocketHandler = ReturnType<typeof defineWebSocketHandler>

const wsLog = (entry: Record<string, unknown>) =>
    console.log(JSON.stringify(entry))

const wsError = (entry: Record<string, unknown>) =>
    console.error(JSON.stringify(entry))

const serializeError = (err: unknown) => ({
    name: err instanceof Error ? err.name : 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
})

const createUpgradeError = (status: number, code: string, message: string) => {
    return Response.json(
        {
            success: false,
            error: {
                code,
                message,
            },
        },
        { status },
    )
}

const getRealtimePermissions = async (request: Request) => {
    const kvClient = getKvClient()
    const initDbClient = dbClient(getDatabaseConfig(request))

    try {
        const initAcl = await aclBuilder(initDbClient, dbSchema, kvClient)
        const initAuth = await auth({
            acl: initAcl,
            appConfig: getAppConfig(),
            db: initDbClient,
            dbSchema,
            kv: kvClient,
        })

        const session = await initAuth.api.getSession({
            headers: request.headers,
        })

        if (!session) {
            throw createUpgradeError(
                401,
                'UNAUTHORIZED',
                'You are not allowed to access this resource.',
            )
        }

        const { success: canListen } = await initAuth.api.hasPermission({
            headers: request.headers,
            body: {
                permissions: {
                    ws: ['listen'],
                },
            },
        })

        if (!canListen) {
            throw createUpgradeError(
                403,
                'FORBIDDEN',
                'You are not allowed to access this resource.',
            )
        }

        const { success: canBroadcast } = await initAuth.api.hasPermission({
            headers: request.headers,
            body: {
                permissions: {
                    ws: ['broadcast'],
                },
            },
        })

        return { canBroadcast }
    } finally {
        await initDbClient.$client.end()
    }
}

export const createNitroWebSocketHandler = (
    channel: string,
): TNitroWebSocketHandler => {
    return defineWebSocketHandler({
        async upgrade(request) {
            const upgradeHeader = request.headers.get('Upgrade')

            if (upgradeHeader?.toLowerCase() !== 'websocket') {
                throw createUpgradeError(
                    426,
                    'WEBSOCKET_UPGRADE_REQUIRED',
                    'Expected Upgrade: websocket',
                )
            }

            const { canBroadcast } = await getRealtimePermissions(request)

            return {
                context: {
                    canBroadcast,
                },
                headers: {
                    'X-WS-Can-Broadcast': canBroadcast ? 'true' : 'false',
                },
                namespace: `ws:${channel}`,
            }
        },
        open(peer) {
            peer.subscribe(messagesTopic)
            wsLog({
                type: 'WS_CONNECT',
                canBroadcast: peer.context.canBroadcast === true,
                channel,
            })
        },
        close(_peer, details) {
            wsLog({ type: 'WS_CLOSE', channel, code: details.code })
        },
        error(_peer, error) {
            wsError({ type: 'WS_ERROR', channel, ...serializeError(error) })
        },
        message(peer, message) {
            if (peer.context.canBroadcast !== true) {
                return
            }

            try {
                peer.publish(messagesTopic, message.json())
            } catch (err) {
                wsError({
                    type: 'WS_MESSAGE_PARSE_ERROR',
                    channel,
                    ...serializeError(err),
                })
                peer.close(1003, 'Invalid JSON payload.')
            }
        },
    })
}
