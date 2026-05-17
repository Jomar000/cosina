export type TWebSocketListener<T extends keyof WebSocketEventMap> = (
    event: WebSocketEventMap[T],
) => void

export type TWebSocketListenerRecord = {
    [T in keyof WebSocketEventMap]: {
        listener: TWebSocketListener<T>
        options?: AddEventListenerOptions | boolean
        type: T
    }
}[keyof WebSocketEventMap]

export type TWebSocketChannel = {
    disconnectIdleTimer: ReturnType<typeof setTimeout> | null
    listeners: Set<TWebSocketListenerRecord>
    reconnectAttempts: number
    reconnectTimer: ReturnType<typeof setTimeout> | null
    refs: number
    socket: WebSocket | null
    userClosed: boolean
}

export type TWsClientManagerOptions = {
    getUrl: (channel: string) => string
    disconnectIdleDelayMs?: number
    reconnectBaseDelayMs?: number
    reconnectMaxDelayMs?: number
}

/**
 * Handle returned by `wsClientManager.connect(channel)`.
 *
 * Each handle represents one consumer of a shared channel socket. Multiple
 * handles for the same channel reuse the same underlying WebSocket. After every
 * handle calls `release()`, the manager keeps the socket idle briefly so route
 * handoffs can reuse it before it is closed.
 */
export type TManagedWebSocketClient = {
    /**
     * Adds an event listener to the current channel socket.
     *
     * The listener is remembered by the manager and automatically attached to
     * replacement sockets after reconnects, so consumers only need to register
     * it once per handle.
     */
    addEventListener: <T extends keyof WebSocketEventMap>(
        type: T,
        listener: TWebSocketListener<T>,
        options?: AddEventListenerOptions | boolean,
    ) => void
    /**
     * Current ready state of the shared channel socket.
     *
     * Returns `WebSocket.CLOSED` when the manager has no active socket for the
     * channel, including the short gap before a scheduled reconnect.
     */
    readonly readyState: number
    /**
     * Current underlying WebSocket instance for this channel, or `null` while
     * disconnected.
     *
     * Prefer the manager methods for listeners, sending, and cleanup so the
     * singleton/ref-count behavior stays intact.
     */
    readonly socket: WebSocket | null
    /**
     * Releases this consumer's reference to the channel.
     *
     * This removes all listeners registered through this handle. When the last
     * active handle is released, the manager cancels any pending reconnect and
     * schedules the shared socket to close after the idle disconnect delay.
     */
    release: () => void
    /**
     * Removes a listener previously added through this handle.
     *
     * Removing it from the handle also removes it from the shared channel
     * listener set, so it will not be reattached after future reconnects.
     */
    removeEventListener: <T extends keyof WebSocketEventMap>(
        type: T,
        listener: TWebSocketListener<T>,
        options?: EventListenerOptions | boolean,
    ) => void
    /**
     * Sends data through the active channel socket.
     *
     * Throws when the channel is not currently open. Callers that send during
     * reconnect windows should retry after an `open` event.
     */
    send: (data: Parameters<WebSocket['send']>[0]) => void
}

export type TWebSocketNativeClient = TManagedWebSocketClient
