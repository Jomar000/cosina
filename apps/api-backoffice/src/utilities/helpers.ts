import type {
    TApiResponse,
    TApiResponseError,
    TValidatorIssue,
} from '@hyperion/types/shared'
import { dbSchema } from '@hyperion/database/postgres'
import { sql } from 'drizzle-orm'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { customAlphabet } from 'nanoid'

import type { THonoInstance } from '../types.js'

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
 * Atomic Key Counter Incrementer
 *
 * @description
 * Creates a key counter at the increment step when missing, otherwise atomically increments it.
 * Wrap this helper and the counter consumer in the same transaction for maximum atomicity.
 */
export const incrementKeyCounter = async (
    client: Pick<THonoInstance['Variables']['dbClient'], 'insert'>,
    counterKey: string,
    incrementStep = 1,
) => {
    const { keyCounter } = dbSchema

    const [row] = await client
        .insert(keyCounter)
        .values({
            key: counterKey,
            counter: incrementStep,
        })
        .onConflictDoUpdate({
            target: keyCounter.key,
            set: {
                counter: sql<number>`${keyCounter.counter} + ${incrementStep}`,
            },
        })
        .returning({
            counter: keyCounter.counter,
        })

    return row.counter
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
