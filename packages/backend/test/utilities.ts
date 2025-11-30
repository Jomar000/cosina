import { env } from 'cloudflare:test'

import app from '../src/core/index.js'

export const setTestingCookies = async () => {
    const response = await Promise.all([
        app.request(
            '/internal/auth/sign-in/username?organizationId=superorganization',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'superadministrator',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        ),
        app.request(
            '/internal/auth/sign-in/username?organizationId=superorganization',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    username: 'member',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        ),
    ])

    return [
        response[0].headers.get('set-cookie') ?? '',
        response[1].headers.get('set-cookie') ?? '',
    ]
}
