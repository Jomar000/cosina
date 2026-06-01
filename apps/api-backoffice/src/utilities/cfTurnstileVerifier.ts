import type { Context } from 'hono'
import { z } from 'zod'

import type { THonoInstance } from '../types.js'

/**
 * CloudFlare Turnstile
 *
 * @link
 * https://developers.cloudflare.com/turnstile
 */
const cfTurnstileSiteVerifyResponseSchema = z.discriminatedUnion('success', [
    z.object({
        success: z.literal(true),
        hostname: z.string().min(1),
        action: z.string().min(1),
    }),
    z.object({
        success: z.literal(false),
        hostname: z.string().min(1).optional(),
        action: z.string().min(1).optional(),
    }),
])

export class CfTurnstileVerifier {
    constructor(private readonly ctx: Context<THonoInstance>) {}

    isBypassed() {
        return this.ctx.get('appConfig').turnstile.bypass
    }

    private logResult(result: boolean, message: string, cause?: unknown) {
        const entry = {
            type: 'CF_TURNSTILE',
            requestId: this.ctx.get('requestId'),
            success: result,
            message,
            cause:
                cause instanceof Error
                    ? {
                          name: cause.name,
                          message: cause.message,
                          stack: cause.stack,
                      }
                    : cause,
        }

        if (result) {
            console.log(JSON.stringify(entry))
        } else {
            console.error(JSON.stringify(entry))
        }

        return result
    }

    private sanitizeToken(token: string) {
        const sanitizedToken = token.trim()

        if (
            !sanitizedToken ||
            sanitizedToken.length >
                this.ctx.get('appConfig').turnstile.tokenMaxLength ||
            /\s/.test(sanitizedToken)
        ) {
            return null
        }

        return sanitizedToken
    }

    async validate({ token, action }: { token: string; action: string }) {
        /////////////////////////////////
        // STEP 1: Verification Bypass //
        /////////////////////////////////

        if (this.isBypassed()) {
            return this.logResult(true, 'CAPTCHA bypass enabled.')
        }

        ////////////////////////////////
        // STEP 2: Token Sanitization //
        ////////////////////////////////

        const sanitizedToken = this.sanitizeToken(token)
        if (!sanitizedToken) {
            return this.logResult(false, 'Invalid CAPTCHA token.')
        }

        /////////////////////////////////////
        // STEP 3: SiteVerify Verification //
        /////////////////////////////////////

        const formData = new FormData()
        const { turnstile, url } = this.ctx.get('appConfig')

        formData.set('secret', turnstile.secretKey)
        formData.set('response', sanitizedToken)

        const ipAddress = this.ctx.get('ipAddress')
        if (ipAddress !== 'N/A') {
            formData.set('remoteip', ipAddress)
        }

        const abortController = new AbortController()
        const abortTimeout = setTimeout(
            () => abortController.abort(),
            turnstile.siteVerifyTimeoutMs,
        )

        try {
            const response = await fetch(turnstile.siteVerify, {
                body: formData,
                method: 'POST',
                signal: abortController.signal,
            })

            return this.validateResponse(response, action, url.frontend)
        } catch (error) {
            return this.logResult(false, 'SiteVerify request failed.', error)
        } finally {
            clearTimeout(abortTimeout)
        }
    }

    private async validateResponse(
        response: Response,
        action: string,
        frontendUrl: string,
    ) {
        if (!response.ok) {
            return this.logResult(
                false,
                'SiteVerify returned a non-OK response.',
                {
                    status: response.status,
                    statusText: response.statusText,
                },
            )
        }

        const validator = cfTurnstileSiteVerifyResponseSchema.safeParse(
            await response.json(),
        )

        if (!validator.success) {
            return this.logResult(false, 'Malformed SiteVerify response.', {
                validatorIssues: validator.error.issues,
            })
        }

        const result = validator.data

        if (result.success !== true) {
            return this.logResult(false, 'SiteVerify challenge failed.')
        }

        const expectedHostname = new URL(frontendUrl).hostname

        if (result.hostname !== expectedHostname) {
            return this.logResult(false, 'SiteVerify hostname mismatch.', {
                expectedHostname,
                receivedHostname: result.hostname,
            })
        }

        if (result.action !== action) {
            return this.logResult(false, 'SiteVerify action mismatch.', {
                expectedAction: action,
                receivedAction: result.action,
            })
        }

        return this.logResult(true, 'CAPTCHA validation succeeded.', {
            hostname: result.hostname,
            action: result.action,
        })
    }
}
