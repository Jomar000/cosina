import { createNitroWebSocketHandler } from '../adapters/nitroWebSocket.js'

type TNitroWebSocketHandler = {
    fetch(request: Request): Promise<Response> | Response
}

// Nitro registers this module directly from nitro.config.ts. Hono does not
// own websocket upgrades; add new websocket channels to this registry.
export const wsChannelHandlers = {
    general: createNitroWebSocketHandler(
        'general',
    ) as unknown as TNitroWebSocketHandler,
} as const

export type TWebSocketChannel = keyof typeof wsChannelHandlers

const wsPathPrefix = '/api/ws/'

const createChannelNotFoundResponse = () => {
    return Response.json(
        {
            success: false,
            error: {
                code: 'NOT_FOUND',
                message: 'WebSocket channel not found.',
            },
        },
        { status: 404 },
    )
}

const getChannelFromRequest = (request: Request): TWebSocketChannel | null => {
    const { pathname } = new URL(request.url)

    if (!pathname.startsWith(wsPathPrefix)) {
        return null
    }

    const channel = pathname.slice(wsPathPrefix.length)

    if (!channel || channel.includes('/')) {
        return null
    }

    return channel in wsChannelHandlers ? (channel as TWebSocketChannel) : null
}

const wsHandler: TNitroWebSocketHandler = {
    fetch(request) {
        const channel = getChannelFromRequest(request)

        if (!channel) {
            return createChannelNotFoundResponse()
        }

        return wsChannelHandlers[channel].fetch(request)
    },
}

export default wsHandler
