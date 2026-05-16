import {
    DEFAULT_RECONNECT_BASE_DELAY_MS,
    DEFAULT_RECONNECT_MAX_DELAY_MS,
} from './constants'
import type {
    TManagedWebSocketClient,
    TWebSocketChannel,
    TWebSocketListenerRecord,
    TWsClientManagerOptions,
} from './types'

export function createWsClientManager(options: TWsClientManagerOptions) {
    const reconnectBaseDelayMs =
        options.reconnectBaseDelayMs ?? DEFAULT_RECONNECT_BASE_DELAY_MS
    const reconnectMaxDelayMs =
        options.reconnectMaxDelayMs ?? DEFAULT_RECONNECT_MAX_DELAY_MS
    const channels = new Map<string, TWebSocketChannel>()

    function getReconnectDelay(attempt: number) {
        const delay = Math.min(
            reconnectBaseDelayMs * 2 ** attempt,
            reconnectMaxDelayMs,
        )
        const jitter = Math.floor(Math.random() * 1000)

        return delay + jitter
    }

    function attachListeners(
        socket: WebSocket,
        listeners: Set<TWebSocketListenerRecord>,
    ) {
        listeners.forEach(({ listener, options, type }) => {
            socket.addEventListener(type, listener as EventListener, options)
        })
    }

    function detachListener(
        socket: WebSocket | null,
        record: TWebSocketListenerRecord,
    ) {
        socket?.removeEventListener(
            record.type,
            record.listener as EventListener,
            record.options,
        )
    }

    function scheduleReconnect(channel: string, entry: TWebSocketChannel) {
        if (entry.refs <= 0 || entry.userClosed || entry.reconnectTimer) return

        const delay = getReconnectDelay(entry.reconnectAttempts)
        entry.reconnectAttempts += 1
        entry.reconnectTimer = setTimeout(() => {
            entry.reconnectTimer = null
            connectChannel(channel, entry)
        }, delay)
    }

    function connectChannel(channel: string, entry: TWebSocketChannel) {
        if (entry.refs <= 0 || entry.userClosed) return
        if (
            entry.socket?.readyState === WebSocket.CONNECTING ||
            entry.socket?.readyState === WebSocket.OPEN
        ) {
            return
        }

        const socket = new WebSocket(options.getUrl(channel))
        entry.socket = socket

        attachListeners(socket, entry.listeners)

        socket.addEventListener('open', () => {
            entry.reconnectAttempts = 0
        })

        socket.addEventListener('close', () => {
            if (entry.socket === socket) {
                entry.socket = null
            }

            scheduleReconnect(channel, entry)
        })

        socket.addEventListener('error', () => {
            socket.close()
        })
    }

    /**
     * Opens or reuses the singleton WebSocket for a channel.
     *
     * Repeated calls for the same channel share one underlying socket and one
     * reconnect timer. The returned handle must be released when the consumer
     * unmounts or no longer needs updates.
     */
    function connect(channel: string): TManagedWebSocketClient {
        const entry = channels.get(channel) ?? {
            listeners: new Set<TWebSocketListenerRecord>(),
            reconnectAttempts: 0,
            reconnectTimer: null,
            refs: 0,
            socket: null,
            userClosed: false,
        }
        const clientListeners = new Set<TWebSocketListenerRecord>()
        let released = false

        entry.refs += 1
        entry.userClosed = false
        channels.set(channel, entry)
        connectChannel(channel, entry)

        return {
            addEventListener: (type, listener, options) => {
                const record = {
                    listener,
                    options,
                    type,
                } as TWebSocketListenerRecord
                clientListeners.add(record)
                entry.listeners.add(record)
                entry.socket?.addEventListener(
                    type,
                    listener as EventListener,
                    options,
                )
            },
            get readyState() {
                return entry.socket?.readyState ?? WebSocket.CLOSED
            },
            get socket() {
                return entry.socket
            },
            release: () => {
                if (released) return
                released = true

                clientListeners.forEach((record) => {
                    detachListener(entry.socket, record)
                    entry.listeners.delete(record)
                })
                clientListeners.clear()
                entry.refs -= 1

                if (entry.refs > 0) return

                entry.userClosed = true
                if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer)
                entry.reconnectTimer = null
                entry.socket?.close()
                entry.socket = null
                channels.delete(channel)
            },
            removeEventListener: (type, listener) => {
                clientListeners.forEach((record) => {
                    if (record.type !== type || record.listener !== listener) {
                        return
                    }

                    detachListener(entry.socket, record)
                    clientListeners.delete(record)
                    entry.listeners.delete(record)
                })
            },
            send: (data) => {
                if (entry.socket?.readyState !== WebSocket.OPEN) {
                    throw new Error(
                        `WebSocket channel "${channel}" is not open.`,
                    )
                }

                entry.socket.send(data)
            },
        }
    }

    return { connect }
}
