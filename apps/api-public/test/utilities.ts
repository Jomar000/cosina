import { env } from 'cloudflare:test'

import app from '../src/core/index.js'

export const setTestingCookies = async () => {
    const response = await Promise.all([
        app.request(
            '/app/auth/sign-in/username',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    organizationId: 'superorganization',
                    accountId: 'superadministrator',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        ),
        app.request(
            '/app/auth/sign-in/username',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    organizationId: 'superorganization',
                    accountId: 'member',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        ),
    ])

    return [
        response[0].headers.getSetCookie().join('; '),
        response[1].headers.getSetCookie().join('; '),
    ] as const
}
