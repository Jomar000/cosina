/**
 * CloudFlare Workers - Durable Objects
 * https://developers.cloudflare.com/durable-objects/best-practices/websockets/
 *
 * @description WebSocket implemented using CF Durable Objects
 */

import { DurableObject } from 'cloudflare:workers'

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

        return new Response(null, {
            status: 101,
            webSocket: client,
        })
    }

    webSocketClose(ws: WebSocket, code: number) {
        try {
            ws.close(code)
        } catch {
            // Best-effort close — socket may already be disconnected by the client
        }
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
        } catch {
            ws.close(1003, 'Invalid JSON payload.')
            return
        }

        if (data) {
            this.ctx.getWebSockets().forEach((wsClient) => {
                // Don't send back to self
                if (
                    wsClient.readyState === 1 && // 1 is OPEN
                    wsClient !== ws
                ) {
                    try {
                        wsClient.send(
                            typeof data === 'object'
                                ? JSON.stringify(data)
                                : String(data),
                        )
                    } catch {
                        /* EMPTY */
                    }
                }
            })
        }
    }

    sendMessage(message: string) {
        this.ctx.getWebSockets().forEach((ws) => {
            if (ws.readyState === 1) {
                // 1 is OPEN
                try {
                    ws.send(message)
                } catch {
                    /* EMPTY */
                }
            }
        })
    }
}
