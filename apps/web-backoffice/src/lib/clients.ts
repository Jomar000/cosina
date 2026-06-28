import type { AdminRouteType } from '@cosina/api-backoffice/api/admin'
import type { AuthRouteType } from '@cosina/api-backoffice/api/auth'
import type { HeartbeatRouteType } from '@cosina/api-backoffice/api/heartbeat'
import type { ObjectStorageRouteType } from '@cosina/api-backoffice/api/objectStorage'
import type { UserRouteType } from '@cosina/api-backoffice/api/user'
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
 * User RPC Client
 */
export const userClient = hc<UserRouteType>(`${PUBLIC_API_URL}/api/user`, {
    init: { credentials: 'include' },
    fetch: kyClient,
})
