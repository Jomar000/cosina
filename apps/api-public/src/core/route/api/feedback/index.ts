import { feedback } from '@cosina/validator/public/feedback'
import { asc, count as countFn, desc, eq } from 'drizzle-orm'
import { type Context, Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import { AppError } from '../../../../errors.js'
import type { TGlobalApiResponses, THonoInstance } from '../../../../types.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
    apiResponsePaginatedOkWrapper,
    auditTrailLogger,
} from '../../../../utilities/helpers.js'
import { captchaHandler } from '../../../middleware/captchaHandler.js'
import { isAuthenticated } from '../../../middleware/isAuthenticated.js'
import { validateRequest } from '../../../middleware/validateRequest.js'

async function broadcastFeedbackEvent(
    ctx: Context<THonoInstance>,
    event: string,
    data: unknown,
) {
    const payload = JSON.stringify({ event, data })

    try {
        const id = ctx.env.COSINABOFC_DO_WSS.idFromName('feedback')
        const stub = ctx.env.COSINABOFC_DO_WSS.get(id)
        await stub.sendMessage(payload)
    } catch {
        // Non-fatal
    }
}

export const feedbackRoute = new Hono<THonoInstance>()
    .post(
        '/create',
        captchaHandler('feedback-create'),
        validateRequest('json', feedback.createInputSchema),
        async (ctx) => {
            const { customerName, rating, comment } = ctx.req.valid('json')

            const organizationId = ctx.env.DEFAULT_ORGANIZATION_ID

            if (!organizationId) {
                throw new AppError({
                    status: 503,
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Service is currently unavailable.',
                })
            }

            // Optionally associate with the authenticated user
            const userId = ctx.get('user')?.id ?? null

            const { customerFeedback } = ctx.get('dbSchema')

            try {
                const [row] = await ctx
                    .get('dbClient')
                    .insert(customerFeedback)
                    .values({
                        organizationId,
                        userId,
                        customerName,
                        rating,
                        comment: comment ?? null,
                    })
                    .returning({
                        publicId: customerFeedback.publicId,
                    })

                await broadcastFeedbackEvent(ctx, 'feedback.create', {
                    publicId: row.publicId,
                    rating,
                    customerName,
                })

                await auditTrailLogger(ctx, {
                    component: 'feedback',
                    action: 'create',
                    description: 'Customer submitted feedback.',
                    records: { table: 'customer_feedback', id: row.publicId },
                })

                return apiResponseOkWrapper(ctx, {
                    data: { publicId: row.publicId },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'FEEDBACK_CREATE_FAILED',
                        message: 'Failed to submit feedback.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .get(
        '/readMany',
        validateRequest('query', feedback.readManyInputSchema),
        async (ctx) => {
            const { limit, offset, sortOrder } = ctx.req.valid('query')

            const organizationId = ctx.env.DEFAULT_ORGANIZATION_ID

            if (!organizationId) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Service is currently unavailable.',
                    status: 503,
                })
            }

            const { customerFeedback } = ctx.get('dbSchema')

            try {
                const whereClause = eq(customerFeedback.status, 'published')

                const count = (
                    await ctx
                        .get('dbClient')
                        .select({ count: countFn(customerFeedback.id) })
                        .from(customerFeedback)
                        .where(whereClause)
                )[0].count

                const orderByClause =
                    sortOrder === 'asc'
                        ? asc(customerFeedback.createdAt)
                        : desc(customerFeedback.createdAt)

                const rows = await ctx
                    .get('dbClient')
                    .select({
                        publicId: customerFeedback.publicId,
                        rating: customerFeedback.rating,
                        comment: customerFeedback.comment,
                        createdAt: customerFeedback.createdAt,
                        userName: customerFeedback.customerName,
                    })
                    .from(customerFeedback)
                    .where(whereClause)
                    .orderBy(orderByClause)
                    .limit(limit)
                    .offset(offset)

                return apiResponsePaginatedOkWrapper(ctx, {
                    data: rows,
                    count,
                    limit,
                    offset,
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'FEEDBACK_READ_FAILED',
                        message: 'Failed to retrieve feedback.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .get(
        '/readMine',
        isAuthenticated(),
        validateRequest('query', feedback.readMineInputSchema),
        async (ctx) => {
            const { limit, offset, sortOrder } = ctx.req.valid('query')

            const userId = ctx.get('user')!.id
            const { customerFeedback } = ctx.get('dbSchema')

            try {
                const whereClause = eq(customerFeedback.userId, userId)

                const count = (
                    await ctx
                        .get('dbClient')
                        .select({ count: countFn(customerFeedback.id) })
                        .from(customerFeedback)
                        .where(whereClause)
                )[0].count

                const orderByClause =
                    sortOrder === 'asc'
                        ? asc(customerFeedback.createdAt)
                        : desc(customerFeedback.createdAt)

                const rows = await ctx
                    .get('dbClient')
                    .select({
                        publicId: customerFeedback.publicId,
                        rating: customerFeedback.rating,
                        comment: customerFeedback.comment,
                        status: customerFeedback.status,
                        createdAt: customerFeedback.createdAt,
                    })
                    .from(customerFeedback)
                    .where(whereClause)
                    .orderBy(orderByClause)
                    .limit(limit)
                    .offset(offset)

                return apiResponsePaginatedOkWrapper(ctx, {
                    data: rows,
                    count,
                    limit,
                    offset,
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'FEEDBACK_READ_FAILED',
                        message: 'Failed to retrieve your feedback.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )

export default feedbackRoute
export type FeedbackRouteType = ApplyGlobalResponse<
    typeof feedbackRoute,
    TGlobalApiResponses
>
