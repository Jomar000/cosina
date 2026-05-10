import { createMiddleware } from 'hono/factory'

import type { THonoInstance } from '../../types.js'
import {
    apiResponseErrorWrapper,
    cfTurnstileVerifier,
} from '../../utilities.js'

/**
 * @description
 * Validates the Cloudflare Turnstile CAPTCHA token from the `x-captcha-response` header.
 */
export const captchaHandler = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        if (ctx.env.ENVIRONMENT === 'test') {
            await next()
            return
        }

        const captchaToken = ctx.req.header('x-captcha-response')

        if (!captchaToken) {
            return apiResponseErrorWrapper(ctx, {
                code: 'BAD_REQUEST',
                message: 'Missing CAPTCHA response.',
            })
        }

        const isValid = await cfTurnstileVerifier(ctx, captchaToken)

        if (!isValid) {
            return apiResponseErrorWrapper(ctx, {
                code: 'FORBIDDEN',
                message: 'CAPTCHA verification failed.',
                status: 403,
            })
        }

        await next()
    })
}
