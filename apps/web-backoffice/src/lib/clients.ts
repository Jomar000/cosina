import type { AuthRouteType } from '@hyperion/api-backoffice/auth'
import type { HeartbeatRouteType } from '@hyperion/api-backoffice/heartbeat'
import type { ObjectStorageRouteType } from '@hyperion/api-backoffice/objectStorage'
import type { UserRouteType } from '@hyperion/api-backoffice/user'
import type { WsRouteType } from '@hyperion/api-backoffice/ws'
import { hc } from 'hono/client'
import ky from 'ky'

import { PUBLIC_API_URL } from '$env/static/public'

/**
 * @description
 * Auth RPC Client
 */
export const authClient = hc<AuthRouteType>(`${PUBLIC_API_URL}/app/auth`, {
    init: { credentials: 'include' },
    fetch: ky,
})

/**
 * @description
 * Heartbeat RPC Client
 */
export const heartbeatClient = hc<HeartbeatRouteType>(
    `${PUBLIC_API_URL}/heartbeat`,
    {
        init: { credentials: 'include' },
        fetch: ky,
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
        fetch: ky,
    },
)

/**
 * @description
 * User RPC Client
 */
export const userClient = hc<UserRouteType>(`${PUBLIC_API_URL}/app/user`, {
    init: { credentials: 'include' },
    fetch: ky,
})

/**
 * @description
 * WebSocket RPC Client
 *
 * @example
 * const socket = wsClient[':channel'].$ws({ param: { channel: 'my-channel' } })
 */
export const wsClient = hc<WsRouteType>(`${PUBLIC_API_URL}/app/ws`, {
    init: { credentials: 'include' },
    fetch: ky,
})
