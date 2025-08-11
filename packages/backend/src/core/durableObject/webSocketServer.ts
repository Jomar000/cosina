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

    async fetch(): Promise<Response> {
        const { 0: client, 1: server } = new WebSocketPair()

        this.ctx.acceptWebSocket(server)

        return new Response(null, {
            status: 101,
            webSocket: client,
        })
    }

    webSocketClose(ws: WebSocket, code: number) {
        try {
            ws.close(code)
        } catch (err) {
            /* EMPTY */
        }
    }

    webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
        try {
            const data = JSON.parse(
                message instanceof ArrayBuffer
                    ? new TextDecoder().decode(message)
                    : message,
            )

            if (data) {
                this.ctx.getWebSockets().forEach((wsClient) => {
                    // Don't send back to self
                    if (
                        wsClient.readyState === wsClient.OPEN &&
                        wsClient !== ws
                    ) {
                        wsClient.send(
                            typeof data === 'object'
                                ? JSON.stringify(data)
                                : data,
                        )
                    }
                })
            }
        } catch (err) {
            /* EMPTY */
        }
    }

    sendMessage(message: string) {
        this.ctx.getWebSockets().forEach((ws) => {
            if (ws.readyState === ws.OPEN) {
                ws.send(message)
            }
        })
    }
}
