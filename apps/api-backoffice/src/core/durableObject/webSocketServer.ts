/**
 * CloudFlare Workers - Durable Objects
 * https://developers.cloudflare.com/durable-objects/best-practices/websockets/
 *
 * @description WebSocket implemented using CF Durable Objects
 */

import { DurableObject } from 'cloudflare:workers'

const wsLog = (entry: Record<string, unknown>) =>
    console.log(JSON.stringify(entry))

const wsError = (entry: Record<string, unknown>) =>
    console.error(JSON.stringify(entry))

const serializeError = (err: unknown) => ({
    name: err instanceof Error ? err.name : 'UNKNOWN_ERROR',
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
})

export class WebSocketServer extends DurableObject {
    constructor(ctx: DurableObjectState, env: THonoBindings) {
        super(ctx, env)
    }

    async fetch(request: Request): Promise<Response> {
        const { 0: client, 1: server } = new WebSocketPair()

        this.ctx.acceptWebSocket(server)

        const canBroadcast =
            request.headers.get('X-WS-Can-Broadcast') === 'true'

        server.serializeAttachment({ canBroadcast })

        wsLog({ type: 'WS_CONNECT', canBroadcast })

        return new Response(null, {
            status: 101,
            webSocket: client,
        })
    }

    webSocketClose(ws: WebSocket, code: number) {
        wsLog({ type: 'WS_CLOSE', code })
        try {
            ws.close(code)
        } catch (err) {
            wsError({ type: 'WS_CLOSE_ERROR', code, ...serializeError(err) })
        }
    }

    webSocketError(ws: WebSocket, error: unknown) {
        wsError({ type: 'WS_ERROR', ...serializeError(error) })
    }

    webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        const { canBroadcast } = ws.deserializeAttachment() as {
            canBroadcast: boolean
        }

        if (!canBroadcast) {
            return
        }

        let data: unknown

        try {
            data = JSON.parse(
                message instanceof ArrayBuffer
                    ? new TextDecoder().decode(message)
                    : message,
            )
        } catch (err) {
            wsError({ type: 'WS_MESSAGE_PARSE_ERROR', ...serializeError(err) })
            ws.close(1003, 'Invalid JSON payload.')
            return
        }

        if (data) {
            this.ctx.getWebSockets().forEach((wsClient) => {
                if (wsClient.readyState === 1 && wsClient !== ws) {
                    try {
                        wsClient.send(
                            typeof data === 'object'
                                ? JSON.stringify(data)
                                : String(data),
                        )
                    } catch (err) {
                        wsError({
                            type: 'WS_MESSAGE_SEND_ERROR',
                            ...serializeError(err),
                        })
                    }
                }
            })
        }
    }

    sendMessage(message: string) {
        this.ctx.getWebSockets().forEach((ws) => {
            if (ws.readyState === 1) {
                try {
                    ws.send(message)
                } catch (err) {
                    wsError({
                        type: 'WS_MESSAGE_SEND_ERROR',
                        ...serializeError(err),
                    })
                }
            }
        })
    }
}
