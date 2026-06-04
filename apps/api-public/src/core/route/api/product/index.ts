import { product } from '@hyperion/validator/public/product'
import { asc, count as countFn, desc, eq, inArray } from 'drizzle-orm'
import type { Context } from 'hono'
import { Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import { AppError } from '../../../../errors.js'
import type { TGlobalApiResponses, THonoInstance } from '../../../../types.js'
import { apiResponseOkWrapper } from '../../../../utilities/helpers.js'
import { validateRequest } from '../../../middleware/validateRequest.js'

function imageUrl(ctx: Context<THonoInstance>, objectStorageId: string | null) {
    if (!objectStorageId) return null
    return `${ctx.env.CF_R2_BUCKET_PUBLIC_URL}/${objectStorageId}`
}

export const productRoute = new Hono<THonoInstance>().get(
    '/readMany',
    validateRequest('query', product.readManyInputSchema),
    async (ctx) => {
        const { limit, offset, sortOrder } = ctx.req.valid('query')

        const { product: productTable, productSize } = ctx.get('dbSchema')

        try {
            const count = (
                await ctx
                    .get('dbClient')
                    .select({ count: countFn(productTable.id) })
                    .from(productTable)
                    .where(eq(productTable.isAvailable, true))
            )[0].count

            const subquery = ctx
                .get('dbClient')
                .select({ id: productTable.id })
                .from(productTable)
                .where(eq(productTable.isAvailable, true))
                .limit(limit)
                .offset(offset)
                .orderBy(
                    sortOrder === 'asc'
                        ? asc(productTable.id)
                        : desc(productTable.id),
                )
                .as('subquery')

            const rows = await ctx
                .get('dbClient')
                .select({
                    id: productTable.id,
                    publicId: productTable.publicId,
                    name: productTable.name,
                    ingredients: productTable.ingredients,
                    category: productTable.category,
                    price: productTable.price,
                    imageObjectStorageId: productTable.imageObjectStorageId,
                    isAvailable: productTable.isAvailable,
                })
                .from(productTable)
                .innerJoin(subquery, eq(subquery.id, productTable.id))
                .orderBy(
                    sortOrder === 'asc'
                        ? asc(productTable.id)
                        : desc(productTable.id),
                )

            const productIds = rows.map((r) => r.id)

            const allSizes =
                productIds.length > 0
                    ? await ctx
                          .get('dbClient')
                          .select({
                              id: productSize.id,
                              productId: productSize.productId,
                              name: productSize.name,
                              price: productSize.price,
                          })
                          .from(productSize)
                          .where(inArray(productSize.productId, productIds))
                          .orderBy(asc(productSize.id))
                    : []

            const data = rows.map((row) => ({
                ...row,
                imageUrl: imageUrl(ctx, row.imageObjectStorageId),
                sizes: allSizes.filter((s) => s.productId === row.id),
            }))

            return apiResponseOkWrapper(ctx, { data, count, limit, offset })
        } catch (err) {
            if (err instanceof AppError) throw err

            throw new AppError(
                {
                    status: 500,
                    code: 'PRODUCT_LIST_FAILED',
                    message: 'Product list retrieval failed.',
                },
                err instanceof Error ? err : undefined,
            )
        }
    },
)

export default productRoute
export type ProductRouteType = ApplyGlobalResponse<
    typeof productRoute,
    TGlobalApiResponses
>
