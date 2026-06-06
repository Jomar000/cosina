import { constantTimeEqual } from 'better-auth/crypto'
import { getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { nanoid } from 'nanoid'

import type { THonoInstance } from '../../types.js'
import { apiResponseErrorWrapper } from '../../utilities/helpers.js'

/**
 * @description
 * Implements CSRF protection via origin checking and naive double-submit cookie pattern
 */
export const csrfHandler = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        if (
            ctx.env.ENVIRONMENT === 'test' ||
            ctx.req.path.startsWith('/api/ws')
        ) {
            await next()
            return
        }

        const safeMethods = [
            'GET',
            'HEAD',
            'OPTIONS',
        ]

        if (safeMethods.includes(ctx.req.method)) {
            if (ctx.req.header('origin') === ctx.env.URL_FRONTEND) {
                setCookie(ctx, 'csrf_token', nanoid(32), {
                    domain: ctx.env.COOKIE_DOMAIN,
                    httpOnly: false,
                    partitioned: true,
                    path: '/',
                    sameSite: 'strict' as const,
                    secure: true,
                })
            }
        } else {
            if (!ctx.req.header('origin')) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'BAD_REQUEST',
                    message: 'Missing Origin request header.',
                })
            }

            if (ctx.env.URL_FRONTEND !== ctx.req.header('origin')) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'FORBIDDEN',
                    message: 'Invalid request origin.',
                    status: 403,
                })
            }

            const tokenFromCookie = getCookie(ctx, 'csrf_token')
            const tokenFromHeader = ctx.req.header('x-csrf-token')

            if (
                !tokenFromCookie ||
                !tokenFromHeader ||
                !constantTimeEqual(
                    new TextEncoder().encode(tokenFromCookie),
                    new TextEncoder().encode(tokenFromHeader),
                )
            ) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'FORBIDDEN',
                    message: 'Invalid CSRF token received.',
                    status: 403,
                })
            }
        }

        await next()
    })
}
