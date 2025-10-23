import type { Context } from 'hono'
import { customAlphabet } from 'nanoid'
import type { ZodType } from 'zod'

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
            ctx.env.ENVIRONMENT === 'development'
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
 * Helper utility for logging activities.
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
                'userId' | 'roleId' | 'recordTable' | 'recordId' | 'recordData'
            >
        >,
) => {
    const { auditTrail } = ctx.get('dbSchema')

    await ctx
        .get('dbClient')
        .insert(auditTrail)
        .values({
            userId: data.userId || ctx.get('user')?.id || 'N/A',
            // roleId: data.roleId ?? ctx.get('user')?.roleId ?? 0, // TODO: Once custom auth flow is good
            roleId: data.roleId ?? 0,
            component: data.component,
            endpoint: ctx.req.path,
            method: ctx.req.method,
            action: data.action,
            description: data.description,
            recordTable: data.recordTable,
            recordId: data.recordId,
            recordData: data.recordData,
            ipAddress: ctx.get('ipAddress'),
            userAgent: ctx.get('userAgent'),
        })
}

/**
 * Hono Validator Callback Function
 *
 * @description
 * Callback function for the built-in Hono Validator Middleware.
 */
export const honoValidatorCb = async <TSchema extends ZodType>(
    value: unknown,
    ctx: Context<THonoInstance>,
    schema: TSchema,
) => {
    const validator = await schema.safeParseAsync(value)

    if (!validator.data) {
        return ctx.json(
            {
                error: {
                    code: 'DATA_VALIDATION',
                    message: 'An error occurred while validating input data.',
                },
                validationErrors: validator.error?.issues,
            },
            400,
        )
    }

    return validator.data
}
