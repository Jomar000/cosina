import type { TApiResponse, TApiResponseError } from '@hyperion/validator'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { customAlphabet } from 'nanoid'
import type { ZodType, z } from 'zod'

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
export const cfTurnstileVerifier = async (
    ctx: Context<THonoInstance>,
    token: string,
) => {
    try {
        if (!token) return false

        const formData = new FormData()
        formData.set('secret', ctx.env.CF_TURNSTILE_SECRET_KEY)
        formData.set('response', token)
        formData.set('remoteip', ctx.get('ipAddress'))

        const result = await fetch(ctx.env.CF_TURNSTILE_SITE_VERIFY, {
            body: formData,
            method: 'POST',
        })

        const outcome = await result.json<{ success: boolean }>()

        if (
            (typeof outcome.success === 'boolean' && outcome.success) ||
            ctx.env.ENVIRONMENT !== 'production'
        ) {
            return true
        }

        return false
    } catch {
        return false
    }
}

/**
 * Audit Trail Logger
 *
 * @description
 * Utility for logging activities.
 */
export const auditTrailLogger = async (
    ctx: Context<THonoInstance>,
    data: Pick<
        typeof ctx.var.dbSchema.auditTrail.$inferInsert,
        'component' | 'action' | 'description'
    > &
        Partial<
            Pick<
                typeof ctx.var.dbSchema.auditTrail.$inferInsert,
                'recordTable' | 'recordId' | 'recordDataOld' | 'recordDataNew'
            >
        >,
) => {
    const { auditTrail } = ctx.get('dbSchema')

    await ctx
        .get('dbClient')
        .insert(auditTrail)
        .values({
            organizationId: ctx.get('session')?.activeOrganizationId || 'N/A',
            userId: ctx.get('user')?.id || 'N/A',
            component: data.component,
            action: data.action,
            description: data.description,
            recordTable: data.recordTable,
            recordId: data.recordId,
            recordDataOld: data.recordDataOld,
            recordDataNew: data.recordDataNew,
            ipAddress: ctx.get('ipAddress'),
            userAgent: ctx.get('userAgent'),
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

    if (!validator.data) {
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
        validatorIssues?: z.core.$ZodIssue[]
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
                ...(validatorIssues ? { validator: validatorIssues } : {}),
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
