import { env } from 'cloudflare:workers'
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

import type { THonoBindings, THonoInstance } from '../src/types.js'
import { getCsrfCookieName, getSessionCookieName } from '../src/auth/cookies.js'
import { csrfHandler } from '../src/core/middleware/csrfHandler.js'

const csrfApp = new Hono<THonoInstance>()
    .use('*', csrfHandler())
    .all('*', (ctx) => ctx.text('OK'))

const stagingEnv = {
    ENVIRONMENT: 'staging',
    URL_FRONTEND: env.URL_FRONTEND,
} as unknown as THonoBindings

describe('Cookie hardening', () => {
    it.each([
        [
            'production',
            '__Host-session_token',
            '__Host-csrf_token',
        ],
        [
            'staging',
            '__Host-staging_session_token',
            '__Host-staging_csrf_token',
        ],
        [
            'test',
            '__Host-test_session_token',
            '__Host-test_csrf_token',
        ],
        [
            'development',
            '__Host-development_session_token',
            '__Host-development_csrf_token',
        ],
    ] as const)(
        'maps %s cookie names',
        (environment, sessionCookieName, csrfCookieName) => {
            expect(getSessionCookieName(environment)).toBe(sessionCookieName)
            expect(getCsrfCookieName(environment)).toBe(csrfCookieName)
        },
    )

    it('emits a host-only staging CSRF cookie for safe requests', async () => {
        const response = await csrfApp.request('/', {}, stagingEnv)
        const cookie = response.headers.get('set-cookie')

        expect(response.status).toBe(200)
        expect(cookie).toMatch(/^__Host-staging_csrf_token=/)
        expect(cookie?.toLowerCase()).toContain('secure')
        expect(cookie?.toLowerCase()).toContain('path=/')
        expect(cookie?.toLowerCase()).not.toContain('domain=')
        expect(cookie?.toLowerCase()).not.toContain('httponly')
        expect(cookie).not.toContain('__Secure-__Host-')
    })

    it('accepts a matching environment-scoped CSRF cookie and header', async () => {
        const token = 'matching-csrf-token'
        const response = await csrfApp.request(
            '/',
            {
                method: 'POST',
                headers: {
                    origin: env.URL_FRONTEND,
                    cookie: `__Host-staging_csrf_token=${token}`,
                    'x-csrf-token': token,
                },
            },
            stagingEnv,
        )

        expect(response.status).toBe(200)
    })

    it.each([
        [
            'missing cookie',
            '',
            'matching-csrf-token',
        ],
        [
            'mismatched token',
            'cookie-token',
            'header-token',
        ],
    ])('rejects a %s', async (_case, cookieToken, headerToken) => {
        const response = await csrfApp.request(
            '/',
            {
                method: 'POST',
                headers: {
                    origin: env.URL_FRONTEND,
                    ...(cookieToken
                        ? {
                              cookie: `__Host-staging_csrf_token=${cookieToken}`,
                          }
                        : {}),
                    'x-csrf-token': headerToken,
                },
            },
            stagingEnv,
        )

        expect(response.status).toBe(403)
    })

    it('does not recognize the legacy CSRF cookie name', async () => {
        const token = 'legacy-csrf-token'
        const response = await csrfApp.request(
            '/',
            {
                method: 'POST',
                headers: {
                    origin: env.URL_FRONTEND,
                    cookie: `csrf_token=${token}`,
                    'x-csrf-token': token,
                },
            },
            stagingEnv,
        )

        expect(response.status).toBe(403)
    })
})
