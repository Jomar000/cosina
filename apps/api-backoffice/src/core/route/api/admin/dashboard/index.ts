import { dashboard } from '@hyperion/validator/backoffice/admin/dashboard'
import { and, count as countFn, eq, gte, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'

import { AppError } from '../../../../../errors.js'
import type { THonoInstance } from '../../../../../types.js'
import { apiResponseOkWrapper } from '../../../../../utilities/helpers.js'
import { validateRequest } from '../../../../middleware/validateRequest.js'

export const dashboardRoute = new Hono<THonoInstance>().get(
    '/stats',
    validateRequest('query', dashboard.statsInputSchema),
    async (ctx) => {
        const { period } = ctx.req.valid('query')
        const { order: orderTable } = ctx.get('dbSchema')

        const now = new Date()
        let startDate: Date
        let truncSql: ReturnType<typeof sql>

        if (period === 'day') {
            startDate = new Date(now)
            startDate.setUTCMinutes(0, 0, 0)
            startDate.setUTCHours(startDate.getUTCHours() - 23)
            truncSql = sql`DATE_TRUNC('hour', ${orderTable.createdAt})`
        } else if (period === 'week') {
            startDate = new Date(now)
            startDate.setUTCHours(0, 0, 0, 0)
            startDate.setUTCDate(startDate.getUTCDate() - 6)
            truncSql = sql`DATE_TRUNC('day', ${orderTable.createdAt})`
        } else {
            startDate = new Date(now)
            startDate.setUTCHours(0, 0, 0, 0)
            startDate.setUTCDate(startDate.getUTCDate() - 29)
            truncSql = sql`DATE_TRUNC('day', ${orderTable.createdAt})`
        }

        try {
            const earningsRows = await ctx
                .get('dbClient')
                .select({
                    periodKey: sql<string>`EXTRACT(EPOCH FROM ${truncSql})::text`,
                    total: sql<string>`COALESCE(SUM(${orderTable.amountToPay}::numeric), 0)::text`,
                })
                .from(orderTable)
                .where(
                    and(
                        eq(orderTable.status, 'completed'),
                        gte(orderTable.createdAt, startDate),
                    ),
                )
                .groupBy(truncSql)
                .orderBy(truncSql)

            const statusRows = await ctx
                .get('dbClient')
                .select({
                    status: orderTable.status,
                    count: countFn(orderTable.id),
                })
                .from(orderTable)
                .where(
                    and(
                        inArray(orderTable.status, [
                            'completed',
                            'cancelled',
                        ]),
                        gte(orderTable.createdAt, startDate),
                    ),
                )
                .groupBy(orderTable.status)

            const completedCount =
                statusRows.find((r) => r.status === 'completed')?.count ?? 0
            const cancelledCount =
                statusRows.find((r) => r.status === 'cancelled')?.count ?? 0

            const totalEarnings = earningsRows
                .reduce((sum, r) => sum + Number(r.total), 0)
                .toFixed(2)

            return apiResponseOkWrapper(ctx, {
                data: {
                    period,
                    startEpoch: Math.floor(startDate.getTime() / 1000),
                    earningsSeries: earningsRows.map((r) => ({
                        periodEpoch: Number(r.periodKey),
                        total: r.total,
                    })),
                    completedCount,
                    cancelledCount,
                    totalEarnings,
                },
            })
        } catch (err) {
            if (err instanceof AppError) throw err

            throw new AppError(
                {
                    status: 500,
                    code: 'DASHBOARD_STATS_FAILED',
                    message: 'Failed to retrieve dashboard statistics.',
                },
                err instanceof Error ? err : undefined,
            )
        }
    },
)

export default dashboardRoute
