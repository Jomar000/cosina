import { audit } from '@cosina/validator/backoffice/admin/audit'
import { and, asc, count as countFn, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import { AppError } from '../../../../../errors.js'
import type {
    TGlobalApiResponses,
    THonoInstance,
} from '../../../../../types.js'
import { apiResponsePaginatedOkWrapper } from '../../../../../utilities/helpers.js'
import { validateRequest } from '../../../../middleware/validateRequest.js'

export const auditRoute = new Hono<THonoInstance>().get(
    '/readMany',
    validateRequest('query', audit.readManyInputSchema),
    async (ctx) => {
        const { limit, offset, sortOrder, component, action } =
            ctx.req.valid('query')

        const { auditTrail: auditTable } = ctx.get('dbSchema')

        const conditions = [
            ...(component ? [eq(auditTable.component, component)] : []),
            ...(action ? [eq(auditTable.action, action)] : []),
        ]
        const whereClause =
            conditions.length > 0 ? and(...conditions) : undefined

        try {
            const count = (
                await ctx
                    .get('dbClient')
                    .select({ count: countFn(auditTable.id) })
                    .from(auditTable)
                    .where(whereClause)
            )[0].count

            const rows = await ctx
                .get('dbClient')
                .select({
                    id: auditTable.id,
                    publicId: auditTable.publicId,
                    organizationId: auditTable.organizationId,
                    userId: auditTable.userId,
                    component: auditTable.component,
                    action: auditTable.action,
                    description: auditTable.description,
                    records: auditTable.records,
                    ipAddress: auditTable.ipAddress,
                    userAgent: auditTable.userAgent,
                    loggedAt: auditTable.loggedAt,
                })
                .from(auditTable)
                .where(whereClause)
                .orderBy(
                    sortOrder === 'asc'
                        ? asc(auditTable.loggedAt)
                        : desc(auditTable.loggedAt),
                )
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
                    code: 'AUDIT_LIST_FAILED',
                    message: 'Audit trail retrieval failed.',
                },
                err instanceof Error ? err : undefined,
            )
        }
    },
)

export type AuditRouteType = ApplyGlobalResponse<
    typeof auditRoute,
    TGlobalApiResponses
>
export default auditRoute
