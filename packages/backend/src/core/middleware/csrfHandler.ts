import { getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { nanoid } from 'nanoid'

/**
 * @description
 * Implements CSRF protection via origin checking and naive double-submit cookie pattern
 */
export const csrfHandler = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        const safeMethods = [
            'GET',
            'OPTIONS',
        ]

        if (safeMethods.includes(ctx.req.method)) {
            setCookie(ctx, 'csrf_token', nanoid(32), {
                domain: ctx.env.COOKIE_DOMAIN,
                httpOnly: false,
                partitioned: true,
                path: '/',
                sameSite: 'strict' as const,
                secure: true,
            })
        } else {
            if (!ctx.req.header('origin')) {
                return ctx.json(
                    {
                        success: false,
                        message: 'Missing Origin request header.',
                    },
                    400,
                )
            }

            const allowedOrigins: string[] = ctx.env.ALLOWED_ORIGINS.split(',')

            if (!allowedOrigins.includes(ctx.req.header('origin')!)) {
                return ctx.json(
                    {
                        success: false,
                        message: 'Invalid request origin.',
                    },
                    403,
                )
            }

            const tokenFromCookie = getCookie(ctx, 'csrf_token')
            const tokenFromHeader = ctx.req.header('x-csrf-token')

            if (!tokenFromCookie || tokenFromCookie !== tokenFromHeader) {
                return ctx.json(
                    {
                        success: false,
                        message: 'Invalid CSRF token received.',
                    },
                    403,
                )
            }
        }

        await next()
    })
}
