import { PUBLIC_API_URL } from '$env/static/public'

import { createWsClientManager } from './core'
import type { TWebSocketNativeClient } from './types'

export type { TWebSocketNativeClient } from './types'

/**
 * Shared WebSocket channel manager for the backoffice API.
 *
 * Use `wsClientManager.connect(channel)` to subscribe to a channel. Calls for
 * the same channel share one underlying socket and one reconnect loop, so
 * multiple components can listen to the same feed without opening duplicate
 * WebSocket connections.
 *
 * Listeners registered through the returned handle are remembered by the
 * manager and reattached after reconnects. Reconnects use capped exponential
 * backoff, and the final `release()` for a channel closes the shared socket and
 * cancels any pending reconnect.
 *
 * Always call `release()` when the consumer unmounts or no longer needs the
 * channel.
 *
 * @example
 * ```ts
 * import { wsClientManager } from '$lib/utilities/wsClientManager'
 *
 * const ws = wsClientManager.connect('general')
 *
 * function handleMessage() {
 *     // TODO: Implement logic here
 * }
 *
 * ws.addEventListener('message', handleMessage)
 *
 * onDestroy(() => {
 *     ws.removeEventListener('message', handleMessage)
 *     ws.release()
 * })
 * ```
 */
export const wsClientManager = createWsClientManager({
    getUrl: (channel) => {
        const wsBase = PUBLIC_API_URL.replace(/^http/, 'ws')
        return `${wsBase}/api/ws/${channel}`
    },
}) satisfies {
    connect: (channel: string) => TWebSocketNativeClient
}
