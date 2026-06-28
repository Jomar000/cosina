import { feedback } from '@cosina/validator/backoffice/admin/feedback'
import { asc, count as countFn, desc, eq } from 'drizzle-orm'
import { type Context, Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import { AppError } from '../../../../../errors.js'
import type {
    TGlobalApiResponses,
    THonoInstance,
} from '../../../../../types.js'
import {
    apiResponseOkWrapper,
    apiResponsePaginatedOkWrapper,
    apiResponseErrorWrapper,
    auditTrailLogger,
} from '../../../../../utilities/helpers.js'
import { validateRequest } from '../../../../middleware/validateRequest.js'

async function broadcastFeedbackEvent(
    ctx: Context<THonoInstance>,
    event: string,
    data: unknown,
) {
    const payload = JSON.stringify({ event, data })

    // Notify backoffice clients
    try {
        const id = ctx.get('doWssClient').idFromName('feedback')
        const stub = ctx.get('doWssClient').get(id)
        await stub.sendMessage(payload)
    } catch {
        // Non-fatal
    }

    // Notify public clients (so published testimonials refresh)
    try {
        const id = ctx.env.COSINAPUB_DO_WSS.idFromName('feedback')
        const stub = ctx.env.COSINAPUB_DO_WSS.get(id)
        await stub.sendMessage(payload)
    } catch {
        // Non-fatal
    }
}

export const feedbackRoute = new Hono<THonoInstance>()
    .get(
        '/readMany',
        validateRequest('query', feedback.readManyInputSchema),
        async (ctx) => {
            const { limit, offset, sortOrder, status } = ctx.req.valid('query')

            const { customerFeedback, user: userTable } = ctx.get('dbSchema')

            try {
                const whereClause = status
                    ? eq(customerFeedback.status, status)
                    : undefined

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
                        id: customerFeedback.id,
                        publicId: customerFeedback.publicId,
                        rating: customerFeedback.rating,
                        comment: customerFeedback.comment,
                        status: customerFeedback.status,
                        createdAt: customerFeedback.createdAt,
                        customerName: customerFeedback.customerName,
                        userEmail: userTable.email,
                    })
                    .from(customerFeedback)
                    .leftJoin(
                        userTable,
                        eq(customerFeedback.userId, userTable.id),
                    )
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
    .post(
        '/updateStatus',
        validateRequest('json', feedback.updateStatusInputSchema),
        async (ctx) => {
            const { feedbackId, status } = ctx.req.valid('json')

            const { customerFeedback } = ctx.get('dbSchema')

            try {
                const [row] = await ctx
                    .get('dbClient')
                    .update(customerFeedback)
                    .set({ status, updatedAt: new Date() })
                    .where(eq(customerFeedback.id, feedbackId))
                    .returning({
                        publicId: customerFeedback.publicId,
                    })

                if (!row) {
                    return apiResponseErrorWrapper(ctx, {
                        code: 'NOT_FOUND',
                        message: 'Feedback not found.',
                        status: 404,
                    })
                }

                await broadcastFeedbackEvent(ctx, 'feedback.statusUpdate', {
                    publicId: row.publicId,
                    status,
                })

                await auditTrailLogger(ctx, {
                    component: 'feedback',
                    action: 'updateStatus',
                    description: `Admin changed feedback status to ${status}.`,
                    records: {
                        table: 'customer_feedback',
                        id: String(feedbackId),
                    },
                })

                return apiResponseOkWrapper(ctx, {
                    data: { publicId: row.publicId },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'FEEDBACK_UPDATE_FAILED',
                        message: 'Failed to update feedback status.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )

export default feedbackRoute
export type FeedbackAdminRouteType = ApplyGlobalResponse<
    typeof feedbackRoute,
    TGlobalApiResponses
>
