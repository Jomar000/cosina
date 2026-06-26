import type { AdminRouteType } from '@hyperion/api-public/api/admin'
import type { AuthRouteType } from '@hyperion/api-public/api/auth'
import type { HeartbeatRouteType } from '@hyperion/api-public/api/heartbeat'
import type { ObjectStorageRouteType } from '@hyperion/api-public/api/objectStorage'
import type { OrderRouteType } from '@hyperion/api-public/api/order'
import type { ProductRouteType } from '@hyperion/api-public/api/product'
import type { UserRouteType } from '@hyperion/api-public/api/user'
import { hc } from 'hono/client'
import ky from 'ky'

import { PUBLIC_API_URL } from '$env/static/public'
import { getCookie, getCsrfCookieName } from './utilities/helpers'

/**
 * @description
 * Inject CSRF token to ky client
 */

const SAFE_METHODS = [
    'GET',
    'HEAD',
    'OPTIONS',
]

const CSRF_COOKIE_NAME = getCsrfCookieName(import.meta.env.MODE)

const kyClient = ky.extend({
    throwHttpErrors: false,
    hooks: {
        beforeRequest: [
            ({ request }) => {
                if (SAFE_METHODS.includes(request.method)) return

                const csrfToken = getCookie(CSRF_COOKIE_NAME)

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
export const adminClient = hc<AdminRouteType>(`${PUBLIC_API_URL}/api/admin`, {
    init: { credentials: 'include' },
    fetch: kyClient,
})

/**
 * @description
 * Auth RPC Client
 */
export const authClient = hc<AuthRouteType>(`${PUBLIC_API_URL}/api/auth`, {
    init: { credentials: 'include' },
    fetch: kyClient,
})

/**
 * @description
 * Heartbeat RPC Client
 */
export const heartbeatClient = hc<HeartbeatRouteType>(
    `${PUBLIC_API_URL}/api/heartbeat`,
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
    `${PUBLIC_API_URL}/api/objectStorage`,
    {
        init: { credentials: 'include' },
        fetch: kyClient,
    },
)

/**
 * @description
 * Order RPC Client
 */
export const orderClient = hc<OrderRouteType>(`${PUBLIC_API_URL}/api/order`, {
    init: { credentials: 'include' },
    fetch: kyClient,
})

/**
 * @description
 * Product RPC Client
 */
export const productClient = hc<ProductRouteType>(
    `${PUBLIC_API_URL}/api/product`,
    { init: { credentials: 'include' }, fetch: kyClient },
)

/**
 * @description
 * User RPC Client
 */
export const userClient = hc<UserRouteType>(`${PUBLIC_API_URL}/api/user`, {
    init: { credentials: 'include' },
    fetch: kyClient,
})
