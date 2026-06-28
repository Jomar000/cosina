import { product } from '@cosina/validator/backoffice/admin/product'
import { asc, count as countFn, desc, eq, inArray } from 'drizzle-orm'
import { type Context, Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import { AppError } from '../../../../../errors.js'
import type {
    TGlobalApiResponses,
    THonoInstance,
} from '../../../../../types.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
    apiResponsePaginatedOkWrapper,
    auditTrailLogger,
    nanoidCustom,
} from '../../../../../utilities/helpers.js'
import { validateRequest } from '../../../../middleware/validateRequest.js'

async function broadcastProductEvent(
    ctx: Context<THonoInstance>,
    event: string,
    data: unknown,
) {
    const payload = JSON.stringify({ event, data })

    // Broadcast to backoffice DO (admin dashboards)
    try {
        const id = ctx.get('doWssClient').idFromName('products')
        const stub = ctx.get('doWssClient').get(id)
        await stub.sendMessage(payload)
    } catch {
        // Non-fatal
    }

    // Broadcast to public DO (customer landing page)
    try {
        const id = ctx.env.COSINAPUB_DO_WSS.idFromName('products')
        const stub = ctx.env.COSINAPUB_DO_WSS.get(id)
        await stub.sendMessage(payload)
    } catch {
        // Non-fatal
    }
}

function imageUrl(ctx: Context<THonoInstance>, objectStorageId: string | null) {
    if (!objectStorageId) return null
    return `${ctx.env.URL_BACKEND}/api/image/view/${objectStorageId}`
}

export const productRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .get(
        '/read',
        validateRequest('query', product.readInputSchema),
        async (ctx) => {
            const { productId } = ctx.req.valid('query')

            const {
                product: productTable,
                productSize,
                productFlavor,
            } = ctx.get('dbSchema')

            try {
                const [row] = await ctx
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
                        tags: productTable.tags,
                    })
                    .from(productTable)
                    .where(eq(productTable.id, productId))

                if (!row) {
                    return apiResponseErrorWrapper(ctx, {
                        code: 'NOT_FOUND',
                        message: 'Product not found.',
                        status: 404,
                    })
                }

                const [
                    sizes,
                    flavors,
                ] = await Promise.all([
                    ctx
                        .get('dbClient')
                        .select({
                            id: productSize.id,
                            name: productSize.name,
                            price: productSize.price,
                        })
                        .from(productSize)
                        .where(eq(productSize.productId, productId))
                        .orderBy(asc(productSize.id)),
                    ctx
                        .get('dbClient')
                        .select({
                            id: productFlavor.id,
                            name: productFlavor.name,
                        })
                        .from(productFlavor)
                        .where(eq(productFlavor.productId, productId))
                        .orderBy(asc(productFlavor.id)),
                ])

                return apiResponseOkWrapper(ctx, {
                    data: {
                        ...row,
                        imageUrl: imageUrl(ctx, row.imageObjectStorageId),
                        sizes,
                        flavors,
                    },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'PRODUCT_READ_FAILED',
                        message: 'Product retrieval failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .get(
        '/readMany',
        validateRequest('query', product.readManyInputSchema),
        async (ctx) => {
            const { limit, offset, sortOrder } = ctx.req.valid('query')

            const {
                product: productTable,
                productSize,
                productFlavor,
            } = ctx.get('dbSchema')

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
                        tags: productTable.tags,
                    })
                    .from(productTable)
                    .innerJoin(subquery, eq(subquery.id, productTable.id))
                    .orderBy(
                        sortOrder === 'asc'
                            ? asc(productTable.id)
                            : desc(productTable.id),
                    )

                const productIds = rows.map((r) => r.id)

                const [
                    allSizes,
                    allFlavors,
                ] = await Promise.all([
                    productIds.length > 0
                        ? ctx
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
                        : Promise.resolve([]),
                    productIds.length > 0
                        ? ctx
                              .get('dbClient')
                              .select({
                                  id: productFlavor.id,
                                  productId: productFlavor.productId,
                                  name: productFlavor.name,
                              })
                              .from(productFlavor)
                              .where(
                                  inArray(productFlavor.productId, productIds),
                              )
                              .orderBy(asc(productFlavor.id))
                        : Promise.resolve([]),
                ])

                const data = rows.map((row) => ({
                    ...row,
                    imageUrl: imageUrl(ctx, row.imageObjectStorageId),
                    sizes: allSizes.filter((s) => s.productId === row.id),
                    flavors: allFlavors.filter((f) => f.productId === row.id),
                }))

                return apiResponsePaginatedOkWrapper(ctx, {
                    data,
                    count,
                    limit,
                    offset,
                })
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
    .post(
        '/create',
        validateRequest('json', product.createInputSchema),
        async (ctx) => {
            const {
                name,
                ingredients,
                category,
                price,
                imageObjectStorageId,
                isAvailable,
                flavors,
                sizes,
                tags,
            } = ctx.req.valid('json')

            const {
                member: memberTable,
                product: productTable,
                productFlavor,
                productSize,
            } = ctx.get('dbSchema')

            let organizationId =
                ctx.get('session')?.activeOrganizationId ?? null

            if (!organizationId) {
                const userId = ctx.get('user')!.id
                organizationId =
                    (
                        await ctx
                            .get('dbClient')
                            .select({
                                organizationId: memberTable.organizationId,
                            })
                            .from(memberTable)
                            .where(eq(memberTable.userId, userId))
                            .limit(1)
                    )[0]?.organizationId ?? null
            }

            if (!organizationId) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NO_ACTIVE_ORGANIZATION',
                    message: 'No active organization found.',
                    status: 400,
                })
            }

            try {
                const data = await ctx
                    .get('dbClient')
                    .transaction(async (tx) => {
                        const [created] = await tx
                            .insert(productTable)
                            .values({
                                organizationId,
                                name,
                                ingredients,
                                category,
                                price,
                                imageObjectStorageId:
                                    imageObjectStorageId ?? null,
                                isAvailable,
                                tags,
                            })
                            .returning({
                                id: productTable.id,
                                publicId: productTable.publicId,
                                name: productTable.name,
                                ingredients: productTable.ingredients,
                                category: productTable.category,
                                price: productTable.price,
                                imageObjectStorageId:
                                    productTable.imageObjectStorageId,
                                isAvailable: productTable.isAvailable,
                                tags: productTable.tags,
                            })

                        const [
                            insertedSizes,
                            insertedFlavors,
                        ] = await Promise.all([
                            sizes && sizes.length > 0
                                ? tx
                                      .insert(productSize)
                                      .values(
                                          sizes.map((s) => ({
                                              productId: created.id,
                                              name: s.name,
                                              price: s.price,
                                          })),
                                      )
                                      .returning({
                                          id: productSize.id,
                                          name: productSize.name,
                                          price: productSize.price,
                                      })
                                : Promise.resolve([]),
                            flavors && flavors.length > 0
                                ? tx
                                      .insert(productFlavor)
                                      .values(
                                          flavors.map((f) => ({
                                              productId: created.id,
                                              name: f.name,
                                          })),
                                      )
                                      .returning({
                                          id: productFlavor.id,
                                          name: productFlavor.name,
                                      })
                                : Promise.resolve([]),
                        ])

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'admin.product',
                                action: 'create',
                                description: 'Admin created a product',
                                records: {
                                    table: 'product',
                                    id: String(created.id),
                                },
                            },
                            tx,
                        )

                        return {
                            ...created,
                            imageUrl: imageUrl(
                                ctx,
                                created.imageObjectStorageId,
                            ),
                            sizes: insertedSizes,
                            flavors: insertedFlavors,
                        }
                    })

                await broadcastProductEvent(ctx, 'product.create', data)

                return apiResponseOkWrapper(ctx, { data })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'PRODUCT_CREATE_FAILED',
                        message: 'Product creation failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .post(
        '/update',
        validateRequest('json', product.updateInputSchema),
        async (ctx) => {
            const {
                productId,
                name,
                ingredients,
                category,
                price,
                imageObjectStorageId,
                isAvailable,
                flavors,
                sizes,
                tags,
            } = ctx.req.valid('json')

            const {
                product: productTable,
                productFlavor,
                productSize,
            } = ctx.get('dbSchema')

            const existing = (
                await ctx
                    .get('dbClient')
                    .select({ count: countFn(productTable.id) })
                    .from(productTable)
                    .where(eq(productTable.id, productId))
            )[0].count

            if (existing === 0) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'Product not found, nothing to update.',
                    status: 404,
                })
            }

            try {
                const data = await ctx
                    .get('dbClient')
                    .transaction(async (tx) => {
                        const [oldData] = await tx
                            .select({
                                name: productTable.name,
                                ingredients: productTable.ingredients,
                                category: productTable.category,
                                price: productTable.price,
                                isAvailable: productTable.isAvailable,
                            })
                            .from(productTable)
                            .where(eq(productTable.id, productId))

                        const [updated] = await tx
                            .update(productTable)
                            .set({
                                ...(name !== undefined && { name }),
                                ...(ingredients !== undefined && {
                                    ingredients,
                                }),
                                ...(category !== undefined && { category }),
                                ...(price !== undefined && { price }),
                                ...(imageObjectStorageId !== undefined && {
                                    imageObjectStorageId:
                                        imageObjectStorageId ?? null,
                                }),
                                ...(isAvailable !== undefined && {
                                    isAvailable,
                                }),
                                ...(tags !== undefined && { tags }),
                            })
                            .where(eq(productTable.id, productId))
                            .returning({
                                id: productTable.id,
                                publicId: productTable.publicId,
                                name: productTable.name,
                                ingredients: productTable.ingredients,
                                category: productTable.category,
                                price: productTable.price,
                                imageObjectStorageId:
                                    productTable.imageObjectStorageId,
                                isAvailable: productTable.isAvailable,
                                tags: productTable.tags,
                            })

                        let updatedSizes: {
                            id: number
                            name: string
                            price: string
                        }[] = []
                        let updatedFlavors: { id: number; name: string }[] = []

                        if (sizes !== undefined) {
                            await tx
                                .delete(productSize)
                                .where(eq(productSize.productId, productId))
                            if (sizes.length > 0) {
                                updatedSizes = await tx
                                    .insert(productSize)
                                    .values(
                                        sizes.map((s) => ({
                                            productId,
                                            name: s.name,
                                            price: s.price,
                                        })),
                                    )
                                    .returning({
                                        id: productSize.id,
                                        name: productSize.name,
                                        price: productSize.price,
                                    })
                            }
                        } else {
                            updatedSizes = await tx
                                .select({
                                    id: productSize.id,
                                    name: productSize.name,
                                    price: productSize.price,
                                })
                                .from(productSize)
                                .where(eq(productSize.productId, productId))
                                .orderBy(asc(productSize.id))
                        }

                        if (flavors !== undefined) {
                            await tx
                                .delete(productFlavor)
                                .where(eq(productFlavor.productId, productId))
                            if (flavors.length > 0) {
                                updatedFlavors = await tx
                                    .insert(productFlavor)
                                    .values(
                                        flavors.map((f) => ({
                                            productId,
                                            name: f.name,
                                        })),
                                    )
                                    .returning({
                                        id: productFlavor.id,
                                        name: productFlavor.name,
                                    })
                            }
                        } else {
                            updatedFlavors = await tx
                                .select({
                                    id: productFlavor.id,
                                    name: productFlavor.name,
                                })
                                .from(productFlavor)
                                .where(eq(productFlavor.productId, productId))
                                .orderBy(asc(productFlavor.id))
                        }

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'admin.product',
                                action: 'update',
                                description: 'Admin updated a product',
                                records: {
                                    table: 'product',
                                    id: String(productId),
                                    oldData,
                                },
                            },
                            tx,
                        )

                        return {
                            ...updated,
                            imageUrl: imageUrl(
                                ctx,
                                updated.imageObjectStorageId,
                            ),
                            sizes: updatedSizes,
                            flavors: updatedFlavors,
                        }
                    })

                await broadcastProductEvent(ctx, 'product.update', data)

                return apiResponseOkWrapper(ctx, { data })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'PRODUCT_UPDATE_FAILED',
                        message: 'Product update failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .post(
        '/delete',
        validateRequest('json', product.deleteInputSchema),
        async (ctx) => {
            const { productId } = ctx.req.valid('json')

            const { product: productTable } = ctx.get('dbSchema')

            const existing = (
                await ctx
                    .get('dbClient')
                    .select({ count: countFn(productTable.id) })
                    .from(productTable)
                    .where(eq(productTable.id, productId))
            )[0].count

            if (existing === 0) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'Product not found, nothing to delete.',
                    status: 404,
                })
            }

            try {
                // product_size rows cascade-delete automatically
                const [deleted] = await ctx
                    .get('dbClient')
                    .delete(productTable)
                    .where(eq(productTable.id, productId))
                    .returning({ id: productTable.id })

                await auditTrailLogger(ctx, {
                    component: 'admin.product',
                    action: 'delete',
                    description: 'Admin deleted a product',
                    records: {
                        table: 'product',
                        id: String(deleted.id),
                    },
                })

                await broadcastProductEvent(ctx, 'product.delete', {
                    id: deleted.id,
                })

                return apiResponseOkWrapper(ctx, { data: deleted })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'PRODUCT_DELETE_FAILED',
                        message: 'Product deletion failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )

    /**
     * @description
     * Proxy image upload — avoids browser-to-R2 CORS by uploading server-side.
     * Accepts multipart/form-data with a single "file" field.
     * Returns { objectStorageId, imageUrl } on success.
     */
    .post('/image/upload', async (ctx) => {
        const body = await ctx.req.parseBody()
        const file = body['file']

        if (!(file instanceof File)) {
            return apiResponseErrorWrapper(ctx, {
                code: 'INVALID_FILE',
                message: 'A valid image file is required.',
                status: 400,
            })
        }

        const mimeType = file.type || 'application/octet-stream'
        const fileSize = file.size

        if (fileSize > 10 * 1024 * 1024) {
            return apiResponseErrorWrapper(ctx, {
                code: 'FILE_TOO_LARGE',
                message: 'Image must be 10 MB or less.',
                status: 400,
            })
        }

        if (!mimeType.startsWith('image/')) {
            return apiResponseErrorWrapper(ctx, {
                code: 'INVALID_MIME_TYPE',
                message: 'Only image files are supported.',
                status: 400,
            })
        }

        const buffer = await file.arrayBuffer()

        // SHA-256 checksum
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
        const hashHex = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')

        const { objectStorage: objectStorageTable } = ctx.get('dbSchema')

        // Check for any existing record with this hash (uploaded or not)
        const [existing] = await ctx
            .get('dbClient')
            .select({
                id: objectStorageTable.id,
                isUploaded: objectStorageTable.isUploaded,
            })
            .from(objectStorageTable)
            .where(eq(objectStorageTable.hashSha256, hashHex))
            .limit(1)

        let objectId: string

        try {
            if (existing?.isUploaded) {
                objectId = existing.id
                // Verify KV still holds the blob (state may have been reset in dev)
                const kvExists = await ctx
                    .get('kvClient')
                    .get(`img:${objectId}`)
                if (kvExists === null) {
                    await ctx.get('kvClient').put(`img:${objectId}`, buffer, {
                        metadata: { mimeType },
                    })
                }
            } else {
                if (existing) {
                    objectId = existing.id
                } else {
                    objectId = nanoidCustom(32)
                    await ctx
                        .get('dbClient')
                        .insert(objectStorageTable)
                        .values({
                            id: objectId,
                            size: fileSize,
                            mimeType,
                            hashSha256: hashHex,
                            isPublic: true,
                            isUploaded: false,
                        })
                }

                await ctx
                    .get('kvClient')
                    .put(`img:${objectId}`, buffer, { metadata: { mimeType } })

                await ctx
                    .get('dbClient')
                    .update(objectStorageTable)
                    .set({ isUploaded: true })
                    .where(eq(objectStorageTable.id, objectId))
            }
        } catch (err) {
            if (err instanceof AppError) throw err

            throw new AppError(
                {
                    status: 500,
                    code: 'IMAGE_UPLOAD_FAILED',
                    message: 'Image upload failed.',
                },
                err instanceof Error ? err : undefined,
            )
        }

        await auditTrailLogger(ctx, {
            component: 'admin.product',
            action: 'image.upload',
            description: 'Admin uploaded product image',
            records: { table: 'object_storage', id: objectId },
        })

        return apiResponseOkWrapper(ctx, {
            data: {
                objectStorageId: objectId,
                imageUrl: `${ctx.env.URL_BACKEND}/api/image/view/${objectId}`,
            },
        })
    })

export type AdminProductRouteType = ApplyGlobalResponse<
    typeof productRoute,
    TGlobalApiResponses
>

export default productRoute
