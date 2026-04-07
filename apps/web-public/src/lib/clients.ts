import type { AdminRouteType } from '@hyperion/api-public/app/admin'
import type { AuthRouteType } from '@hyperion/api-public/app/auth'
import type { ObjectStorageRouteType } from '@hyperion/api-public/app/objectStorage'
import type { UserRouteType } from '@hyperion/api-public/app/user'
import type { HeartbeatRouteType } from '@hyperion/api-public/root/heartbeat'
import { hc } from 'hono/client'
import ky from 'ky'

import { PUBLIC_API_URL } from '$env/static/public'
import { getCookie } from './utilities'

/**
 * @description
 * Inject CSRF token to ky client
 */

const SAFE_METHODS = [
    'GET',
    'HEAD',
    'OPTIONS',
]

const kyClient = ky.extend({
    hooks: {
        beforeRequest: [
            ({ request }) => {
                if (SAFE_METHODS.includes(request.method)) return

                const csrfToken = getCookie('csrf_token')

                if (csrfToken) {
                    request.headers.set(
                        'x-csrf-token',
                        decodeURIComponent(csrfToken),
                    )
                }
            },
        ],
    },
})

/**
 * @description
 * Admin RPC Client
 */
export const adminClient = hc<AdminRouteType>(`${PUBLIC_API_URL}/app/admin`, {
    init: { credentials: 'include' },
    fetch: kyClient,
})

/**
 * @description
 * Auth RPC Client
 */
export const authClient = hc<AuthRouteType>(`${PUBLIC_API_URL}/app/auth`, {
    init: { credentials: 'include' },
    fetch: kyClient,
})

/**
 * @description
 * Heartbeat RPC Client
 */
export const heartbeatClient = hc<HeartbeatRouteType>(
    `${PUBLIC_API_URL}/heartbeat`,
    {
        init: { credentials: 'include' },
        fetch: kyClient,
    },
)

/**
 * @description
 * Object Storage RPC Client
 */
export const objectStorageClient = hc<ObjectStorageRouteType>(
    `${PUBLIC_API_URL}/app/objectStorage`,
    {
        init: { credentials: 'include' },
        fetch: kyClient,
    },
)

/**
 * @description
 * User RPC Client
 */
export const userClient = hc<UserRouteType>(`${PUBLIC_API_URL}/app/user`, {
    init: { credentials: 'include' },
    fetch: kyClient,
})

/**
 * @description
 * Native WebSocket Client
 *
 * @example
 * const socket = wsNativeClient('general')
 * socket.addEventListener('message', (e) => console.log(e.data))
 */
export function wsNativeClient(channel: string): WebSocket {
    const wsBase = PUBLIC_API_URL.replace(/^https?/, 'wss')
    return new WebSocket(`${wsBase}/app/ws/${channel}`)
}
