import type {
    TApiResponse,
    TApiResponseError,
    TValidatorIssue,
} from '@hyperion/types/shared'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { customAlphabet } from 'nanoid'
import { z, type ZodType } from 'zod'

import type { THonoInstance } from './types.js'

/**
 * NanoID Custom Character Set
 *
 * @description
 * Generate NanoIDs with custom alphabet & length fit for use as identifiers.
 *
 * @link
 * https://zelark.github.io/nano-id-cc
 */
export const nanoidCustom = customAlphabet(
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    12,
)

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
        return Number(this.ctx.env.CF_TURNSTILE_BYPASS) === 1
    }

    private logResult(result: boolean, message: string, data?: unknown) {
        const logFn = result ? console.info : console.error

        if (data === undefined) {
            logFn(`[CfTurnstileVerifier] ${message}`)
        } else {
            logFn(`[CfTurnstileVerifier] ${message}`, data)
        }

        return result
    }

    private sanitizeToken(token: string) {
        const sanitizedToken = token.trim()

        if (
            !sanitizedToken ||
            sanitizedToken.length >
                this.ctx.env.CF_TURNSTILE_TOKEN_MAX_LENGTH ||
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
        formData.set('secret', this.ctx.env.CF_TURNSTILE_SECRET_KEY)
        formData.set('response', sanitizedToken)

        const ipAddress = this.ctx.get('ipAddress')
        if (ipAddress !== 'N/A') {
            formData.set('remoteip', ipAddress)
        }

        const abortController = new AbortController()
        const abortTimeout = setTimeout(
            () => abortController.abort(),
            Number(this.ctx.env.CF_TURNSTILE_SITE_VERIFY_TIMEOUT_MS),
        )

        try {
            const response = await fetch(
                this.ctx.env.CF_TURNSTILE_SITE_VERIFY,
                {
                    body: formData,
                    method: 'POST',
                    signal: abortController.signal,
                },
            )

            return this.validateResponse(response, action)
        } catch (error) {
            return this.logResult(false, 'SiteVerify request failed.', error)
        } finally {
            clearTimeout(abortTimeout)
        }
    }

    private async validateResponse(response: Response, action: string) {
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

        const expectedHostname = new URL(this.ctx.env.URL_FRONTEND).hostname
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

/**
 * Audit Trail Logger
 *
 * @description
 * Utility for logging activities.
 */
type TAuditRecord = {
    table: string
    id: string
    oldData?: unknown
}

export const auditTrailLogger = async (
    ctx: Context<THonoInstance>,
    data: Pick<
        typeof ctx.var.dbSchema.auditTrail.$inferInsert,
        'component' | 'action' | 'description'
    > & {
        records?: TAuditRecord | TAuditRecord[]
    },
    client: Pick<typeof ctx.var.dbClient, 'insert'> = ctx.get('dbClient'),
) => {
    const { auditTrail } = ctx.get('dbSchema')

    await client.insert(auditTrail).values({
        organizationId: ctx.get('session')?.activeOrganizationId ?? null,
        userId: ctx.get('user')?.id ?? null,
        component: data.component,
        action: data.action,
        description: data.description,
        records: data.records
            ? Array.isArray(data.records)
                ? data.records
                : [data.records]
            : null,
        ipAddress: ctx.get('ipAddress') ?? null,
        userAgent: ctx.get('userAgent') ?? null,
    })
}

/**
 * Validator Callback Function
 *
 * @description
 * Callback function for the built-in Hono Validator Middleware.
 */
export const validatorCallback = async <TSchema extends ZodType>(
    value: unknown,
    ctx: Context<THonoInstance>,
    schema: TSchema,
) => {
    const validator = await schema.safeParseAsync(value)

    if (!validator.success) {
        return apiResponseErrorWrapper(ctx, {
            code: 'DATA_VALIDATION',
            message: 'An error occurred while validating input data.',
            validatorIssues: validator.error?.issues,
        })
    }

    return validator.data
}

/**
 * API Response Error Wrapper
 *
 * @description
 * Wrapper for failed API responses.
 */
export const apiResponseErrorWrapper = (
    ctx: Context<THonoInstance>,
    {
        message,
        code = 'BAD_REQUEST',
        validatorIssues,
        status = 400,
    }: {
        message: string
        code?: string
        validatorIssues?: TValidatorIssue[]
        status?: ContentfulStatusCode
    },
) => {
    return ctx.json<TApiResponseError>(
        {
            success: false,
            error: {
                requestId: ctx.get('requestId'),
                code,
                message,
                ...(validatorIssues ? { validatorIssues } : {}),
            },
        },
        status,
    )
}

/**
 * API Response Success Wrapper
 *
 * @description
 * Wrapper for successful API responses.
 */
export const apiResponseOkWrapper = <T = unknown>(
    ctx: Context<THonoInstance>,
    {
        data,
        count,
        limit,
        offset,
        status = 200,
    }: {
        data: T
        count?: number
        limit?: number
        offset?: number
        status?: ContentfulStatusCode
    },
) => {
    return ctx.json<TApiResponse<T>>(
        {
            success: true,
            data,
            count,
            limit,
            offset,
        },
        status,
    )
}
