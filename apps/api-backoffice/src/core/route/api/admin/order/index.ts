import { order } from '@cosina/validator/backoffice/admin/order'
import {
    and,
    asc,
    count as countFn,
    desc,
    eq,
    inArray,
    ne,
    or,
    sql,
} from 'drizzle-orm'
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
    nanoidOrderCode,
} from '../../../../../utilities/helpers.js'
import { validateRequest } from '../../../../middleware/validateRequest.js'

async function broadcastOrderEvent(
    ctx: Context<THonoInstance>,
    event: string,
    data: unknown,
) {
    const payload = JSON.stringify({ event, data })

    // Broadcast to backoffice DO (admin orders WS clients)
    try {
        const id = ctx.get('doWssClient').idFromName('orders')
        const stub = ctx.get('doWssClient').get(id)
        await stub.sendMessage(payload)
    } catch {
        // Non-fatal
    }

    // Broadcast to public DO (customer tracking page WS clients)
    try {
        const id = ctx.env.COSINAPUB_DO_WSS.idFromName('orders')
        const stub = ctx.env.COSINAPUB_DO_WSS.get(id)
        await stub.sendMessage(payload)
    } catch {
        // Non-fatal
    }
}

function proofUrl(ctx: Context<THonoInstance>, objectStorageId: string | null) {
    if (!objectStorageId) return null
    return `${ctx.env.URL_BACKEND}/api/image/view/${objectStorageId}`
}

async function deleteProofImageIfUnused(
    ctx: Context<THonoInstance>,
    currentOrderId: number,
    objectId: string,
) {
    const { order: orderTable, objectStorage: objectStorageTable } =
        ctx.get('dbSchema')
    const db = ctx.get('dbClient')

    const [{ count }] = await db
        .select({ count: countFn(orderTable.id) })
        .from(orderTable)
        .where(
            and(
                ne(orderTable.id, currentOrderId),
                or(
                    eq(orderTable.proofOfPaymentObjectStorageId, objectId),
                    eq(
                        orderTable.remainingBalanceProofObjectStorageId,
                        objectId,
                    ),
                ),
            ),
        )

    if (count === 0) {
        await ctx.env.COSINAPUB_KV.delete(`img:${objectId}`)
        await db
            .update(objectStorageTable)
            .set({ isUploaded: false })
            .where(eq(objectStorageTable.id, objectId))
    }
}

export const orderRoute = new Hono<THonoInstance>()
    .get(
        '/read',
        validateRequest('query', order.readInputSchema),
        async (ctx) => {
            const { orderId } = ctx.req.valid('query')

            const { order: orderTable, orderItem: orderItemTable } =
                ctx.get('dbSchema')

            try {
                const [row] = await ctx
                    .get('dbClient')
                    .select({
                        id: orderTable.id,
                        publicId: orderTable.publicId,
                        trackingCode: orderTable.trackingCode,
                        customerName: orderTable.customerName,
                        contactNumber: orderTable.contactNumber,
                        contactNumber2: orderTable.contactNumber2,
                        deliveryType: orderTable.deliveryType,
                        deliveryAt: orderTable.deliveryAt,
                        downpayment: orderTable.downpayment,
                        amountToPay: orderTable.amountToPay,
                        proofOfPaymentObjectStorageId:
                            orderTable.proofOfPaymentObjectStorageId,
                        remainingBalancePaymentMethod:
                            orderTable.remainingBalancePaymentMethod,
                        remainingBalanceProofObjectStorageId:
                            orderTable.remainingBalanceProofObjectStorageId,
                        proofOfPaymentStatus: orderTable.proofOfPaymentStatus,
                        proofOfPaymentFakeReason:
                            orderTable.proofOfPaymentFakeReason,
                        remainingBalanceProofStatus:
                            orderTable.remainingBalanceProofStatus,
                        remainingBalanceProofFakeReason:
                            orderTable.remainingBalanceProofFakeReason,
                        remainingBalanceSenderName:
                            orderTable.remainingBalanceSenderName,
                        remainingBalanceSenderNumber:
                            orderTable.remainingBalanceSenderNumber,
                        remainingBalanceAmountSent:
                            orderTable.remainingBalanceAmountSent,
                        status: orderTable.status,
                        notes: orderTable.notes,
                        createdAt: orderTable.createdAt,
                    })
                    .from(orderTable)
                    .where(eq(orderTable.id, orderId))

                if (!row) {
                    return apiResponseErrorWrapper(ctx, {
                        code: 'NOT_FOUND',
                        message: 'Order not found.',
                        status: 404,
                    })
                }

                const items = await ctx
                    .get('dbClient')
                    .select({
                        id: orderItemTable.id,
                        productId: orderItemTable.productId,
                        name: orderItemTable.name,
                        sizeName: orderItemTable.sizeName,
                        flavorName: orderItemTable.flavorName,
                        quantity: orderItemTable.quantity,
                        price: orderItemTable.price,
                    })
                    .from(orderItemTable)
                    .where(eq(orderItemTable.orderId, orderId))
                    .orderBy(asc(orderItemTable.id))

                return apiResponseOkWrapper(ctx, {
                    data: {
                        ...row,
                        proofOfPaymentUrl: proofUrl(
                            ctx,
                            row.proofOfPaymentObjectStorageId,
                        ),
                        remainingBalanceProofUrl: proofUrl(
                            ctx,
                            row.remainingBalanceProofObjectStorageId,
                        ),
                        items,
                    },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'ORDER_READ_FAILED',
                        message: 'Order retrieval failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .get(
        '/readMany',
        validateRequest('query', order.readManyInputSchema),
        async (ctx) => {
            const { limit, offset, sortOrder, status } = ctx.req.valid('query')

            const { order: orderTable, orderItem: orderItemTable } =
                ctx.get('dbSchema')

            try {
                const whereClause = status
                    ? eq(orderTable.status, status)
                    : undefined

                const count = (
                    await ctx
                        .get('dbClient')
                        .select({ count: countFn(orderTable.id) })
                        .from(orderTable)
                        .where(whereClause)
                )[0].count

                // Sort by soonest delivery date first (nulls last), then newest
                // created orders as the tiebreaker.
                const orderByClause =
                    sortOrder === 'asc'
                        ? [
                              sql`${orderTable.deliveryAt} ASC NULLS LAST`,
                              desc(orderTable.createdAt),
                          ]
                        : [
                              sql`${orderTable.deliveryAt} DESC NULLS LAST`,
                              desc(orderTable.createdAt),
                          ]

                const subquery = ctx
                    .get('dbClient')
                    .select({ id: orderTable.id })
                    .from(orderTable)
                    .where(whereClause)
                    .limit(limit)
                    .offset(offset)
                    .orderBy(...orderByClause)
                    .as('subquery')

                const rows = await ctx
                    .get('dbClient')
                    .select({
                        id: orderTable.id,
                        publicId: orderTable.publicId,
                        trackingCode: orderTable.trackingCode,
                        customerName: orderTable.customerName,
                        contactNumber: orderTable.contactNumber,
                        contactNumber2: orderTable.contactNumber2,
                        deliveryType: orderTable.deliveryType,
                        deliveryAt: orderTable.deliveryAt,
                        downpayment: orderTable.downpayment,
                        amountToPay: orderTable.amountToPay,
                        proofOfPaymentObjectStorageId:
                            orderTable.proofOfPaymentObjectStorageId,
                        remainingBalancePaymentMethod:
                            orderTable.remainingBalancePaymentMethod,
                        remainingBalanceProofObjectStorageId:
                            orderTable.remainingBalanceProofObjectStorageId,
                        proofOfPaymentStatus: orderTable.proofOfPaymentStatus,
                        proofOfPaymentFakeReason:
                            orderTable.proofOfPaymentFakeReason,
                        remainingBalanceProofStatus:
                            orderTable.remainingBalanceProofStatus,
                        remainingBalanceProofFakeReason:
                            orderTable.remainingBalanceProofFakeReason,
                        remainingBalanceSenderName:
                            orderTable.remainingBalanceSenderName,
                        remainingBalanceSenderNumber:
                            orderTable.remainingBalanceSenderNumber,
                        remainingBalanceAmountSent:
                            orderTable.remainingBalanceAmountSent,
                        status: orderTable.status,
                        notes: orderTable.notes,
                        createdAt: orderTable.createdAt,
                    })
                    .from(orderTable)
                    .innerJoin(subquery, eq(subquery.id, orderTable.id))
                    .orderBy(...orderByClause)

                const orderIds = rows.map((r) => r.id)

                const allItems =
                    orderIds.length > 0
                        ? await ctx
                              .get('dbClient')
                              .select({
                                  id: orderItemTable.id,
                                  orderId: orderItemTable.orderId,
                                  productId: orderItemTable.productId,
                                  name: orderItemTable.name,
                                  sizeName: orderItemTable.sizeName,
                                  flavorName: orderItemTable.flavorName,
                                  quantity: orderItemTable.quantity,
                                  price: orderItemTable.price,
                              })
                              .from(orderItemTable)
                              .where(inArray(orderItemTable.orderId, orderIds))
                              .orderBy(asc(orderItemTable.id))
                        : []

                const data = rows.map((row) => ({
                    ...row,
                    proofOfPaymentUrl: proofUrl(
                        ctx,
                        row.proofOfPaymentObjectStorageId,
                    ),
                    remainingBalanceProofUrl: proofUrl(
                        ctx,
                        row.remainingBalanceProofObjectStorageId,
                    ),
                    items: allItems.filter((item) => item.orderId === row.id),
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
                        code: 'ORDER_LIST_FAILED',
                        message: 'Order list retrieval failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .post(
        '/create',
        validateRequest('json', order.createInputSchema),
        async (ctx) => {
            const {
                customerName,
                contactNumber,
                contactNumber2,
                deliveryType,
                deliveryAt,
                downpayment,
                amountToPay,
                proofOfPaymentObjectStorageId,
                notes,
                items,
            } = ctx.req.valid('json')

            const {
                member: memberTable,
                order: orderTable,
                orderItem: orderItemTable,
            } = ctx.get('dbSchema')

            // Derive org from session; fall back to member table lookup.
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
                            .insert(orderTable)
                            .values({
                                trackingCode: nanoidOrderCode(),
                                organizationId,
                                customerName,
                                contactNumber,
                                contactNumber2: contactNumber2 ?? null,
                                deliveryType,
                                deliveryAt: deliveryAt
                                    ? new Date(deliveryAt)
                                    : null,
                                downpayment: downpayment ?? null,
                                amountToPay,
                                proofOfPaymentObjectStorageId:
                                    proofOfPaymentObjectStorageId ?? null,
                                notes: notes ?? null,
                            })
                            .returning({
                                id: orderTable.id,
                                publicId: orderTable.publicId,
                                trackingCode: orderTable.trackingCode,
                                customerName: orderTable.customerName,
                                contactNumber: orderTable.contactNumber,
                                contactNumber2: orderTable.contactNumber2,
                                deliveryType: orderTable.deliveryType,
                                deliveryAt: orderTable.deliveryAt,
                                amountToPay: orderTable.amountToPay,
                                proofOfPaymentObjectStorageId:
                                    orderTable.proofOfPaymentObjectStorageId,
                                status: orderTable.status,
                                notes: orderTable.notes,
                                createdAt: orderTable.createdAt,
                            })

                        const insertedItems =
                            items && items.length > 0
                                ? await tx
                                      .insert(orderItemTable)
                                      .values(
                                          items.map((item) => ({
                                              orderId: created.id,
                                              productId: item.productId ?? null,
                                              name: item.name,
                                              sizeName: item.sizeName ?? null,
                                              flavorName:
                                                  item.flavorName ?? null,
                                              quantity: item.quantity,
                                              price: item.price,
                                          })),
                                      )
                                      .returning({
                                          id: orderItemTable.id,
                                          productId: orderItemTable.productId,
                                          name: orderItemTable.name,
                                          sizeName: orderItemTable.sizeName,
                                          flavorName: orderItemTable.flavorName,
                                          quantity: orderItemTable.quantity,
                                          price: orderItemTable.price,
                                      })
                                : []

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'admin.order',
                                action: 'create',
                                description: 'Admin created an order',
                                records: {
                                    table: 'order',
                                    id: String(created.id),
                                },
                            },
                            tx,
                        )

                        return {
                            ...created,
                            proofOfPaymentUrl: proofUrl(
                                ctx,
                                created.proofOfPaymentObjectStorageId,
                            ),
                            items: insertedItems,
                        }
                    })

                await broadcastOrderEvent(ctx, 'order.create', data)

                return apiResponseOkWrapper(ctx, { data })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'ORDER_CREATE_FAILED',
                        message: 'Order creation failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .post(
        '/update',
        validateRequest('json', order.updateInputSchema),
        async (ctx) => {
            const {
                orderId,
                customerName,
                contactNumber,
                contactNumber2,
                deliveryType,
                deliveryAt,
                downpayment,
                amountToPay,
                proofOfPaymentObjectStorageId,
                notes,
            } = ctx.req.valid('json')

            const { order: orderTable } = ctx.get('dbSchema')

            const existing = (
                await ctx
                    .get('dbClient')
                    .select({ count: countFn(orderTable.id) })
                    .from(orderTable)
                    .where(eq(orderTable.id, orderId))
            )[0].count

            if (existing === 0) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'Order not found, nothing to update.',
                    status: 404,
                })
            }

            try {
                const data = await ctx
                    .get('dbClient')
                    .transaction(async (tx) => {
                        const [oldData] = await tx
                            .select({
                                customerName: orderTable.customerName,
                                contactNumber: orderTable.contactNumber,
                                contactNumber2: orderTable.contactNumber2,
                                deliveryType: orderTable.deliveryType,
                                amountToPay: orderTable.amountToPay,
                                status: orderTable.status,
                            })
                            .from(orderTable)
                            .where(eq(orderTable.id, orderId))

                        const [updated] = await tx
                            .update(orderTable)
                            .set({
                                ...(customerName !== undefined && {
                                    customerName,
                                }),
                                ...(contactNumber !== undefined && {
                                    contactNumber,
                                }),
                                ...(contactNumber2 !== undefined && {
                                    contactNumber2: contactNumber2 ?? null,
                                }),
                                ...(deliveryType !== undefined && {
                                    deliveryType,
                                }),
                                ...(deliveryAt !== undefined && {
                                    deliveryAt: deliveryAt
                                        ? new Date(deliveryAt)
                                        : null,
                                }),
                                ...(downpayment !== undefined && {
                                    downpayment: downpayment ?? null,
                                }),
                                ...(amountToPay !== undefined && {
                                    amountToPay,
                                }),
                                ...(proofOfPaymentObjectStorageId !==
                                    undefined && {
                                    proofOfPaymentObjectStorageId:
                                        proofOfPaymentObjectStorageId ?? null,
                                }),
                                ...(notes !== undefined && {
                                    notes: notes ?? null,
                                }),
                            })
                            .where(eq(orderTable.id, orderId))
                            .returning({
                                id: orderTable.id,
                                publicId: orderTable.publicId,
                                trackingCode: orderTable.trackingCode,
                                customerName: orderTable.customerName,
                                contactNumber: orderTable.contactNumber,
                                contactNumber2: orderTable.contactNumber2,
                                deliveryType: orderTable.deliveryType,
                                deliveryAt: orderTable.deliveryAt,
                                amountToPay: orderTable.amountToPay,
                                proofOfPaymentObjectStorageId:
                                    orderTable.proofOfPaymentObjectStorageId,
                                status: orderTable.status,
                                notes: orderTable.notes,
                                createdAt: orderTable.createdAt,
                            })

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'admin.order',
                                action: 'update',
                                description: 'Admin updated an order',
                                records: {
                                    table: 'order',
                                    id: String(orderId),
                                    oldData,
                                },
                            },
                            tx,
                        )

                        return {
                            ...updated,
                            proofOfPaymentUrl: proofUrl(
                                ctx,
                                updated.proofOfPaymentObjectStorageId,
                            ),
                        }
                    })

                await broadcastOrderEvent(ctx, 'order.update', data)

                return apiResponseOkWrapper(ctx, { data })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'ORDER_UPDATE_FAILED',
                        message: 'Order update failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .post(
        '/updateStatus',
        validateRequest('json', order.updateStatusInputSchema),
        async (ctx) => {
            const { orderId, status } = ctx.req.valid('json')

            const { order: orderTable } = ctx.get('dbSchema')

            const existing = (
                await ctx
                    .get('dbClient')
                    .select({ count: countFn(orderTable.id) })
                    .from(orderTable)
                    .where(eq(orderTable.id, orderId))
            )[0].count

            if (existing === 0) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'Order not found, nothing to update.',
                    status: 404,
                })
            }

            try {
                const data = await ctx
                    .get('dbClient')
                    .transaction(async (tx) => {
                        const [oldData] = await tx
                            .select({
                                status: orderTable.status,
                                proofOfPaymentObjectStorageId:
                                    orderTable.proofOfPaymentObjectStorageId,
                                remainingBalanceProofObjectStorageId:
                                    orderTable.remainingBalanceProofObjectStorageId,
                            })
                            .from(orderTable)
                            .where(eq(orderTable.id, orderId))

                        const [updated] = await tx
                            .update(orderTable)
                            .set({ status })
                            .where(eq(orderTable.id, orderId))
                            .returning({
                                id: orderTable.id,
                                status: orderTable.status,
                            })

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'admin.order',
                                action: 'updateStatus',
                                description: 'Admin updated order status',
                                records: {
                                    table: 'order',
                                    id: String(orderId),
                                    oldData: { status: oldData.status },
                                },
                            },
                            tx,
                        )

                        return {
                            ...updated,
                            _proofOfPaymentObjectStorageId:
                                oldData.proofOfPaymentObjectStorageId,
                            _remainingBalanceProofObjectStorageId:
                                oldData.remainingBalanceProofObjectStorageId,
                        }
                    })

                await broadcastOrderEvent(ctx, 'order.statusUpdate', {
                    id: data.id,
                    status: data.status,
                })

                if (status === 'completed' || status === 'cancelled') {
                    for (const objectId of [
                        data._proofOfPaymentObjectStorageId,
                        data._remainingBalanceProofObjectStorageId,
                    ]) {
                        if (objectId) {
                            await deleteProofImageIfUnused(
                                ctx,
                                orderId,
                                objectId,
                            ).catch(() => undefined)
                        }
                    }
                }

                return apiResponseOkWrapper(ctx, {
                    data: { id: data.id, status: data.status },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'ORDER_STATUS_UPDATE_FAILED',
                        message: 'Order status update failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .post(
        '/delete',
        validateRequest('json', order.deleteInputSchema),
        async (ctx) => {
            const { orderId } = ctx.req.valid('json')

            const { order: orderTable } = ctx.get('dbSchema')

            const existing = (
                await ctx
                    .get('dbClient')
                    .select({ count: countFn(orderTable.id) })
                    .from(orderTable)
                    .where(eq(orderTable.id, orderId))
            )[0].count

            if (existing === 0) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'Order not found, nothing to delete.',
                    status: 404,
                })
            }

            try {
                const [deleted] = await ctx
                    .get('dbClient')
                    .delete(orderTable)
                    .where(eq(orderTable.id, orderId))
                    .returning({ id: orderTable.id })

                await auditTrailLogger(ctx, {
                    component: 'admin.order',
                    action: 'delete',
                    description: 'Admin deleted an order',
                    records: {
                        table: 'order',
                        id: String(deleted.id),
                    },
                })

                await broadcastOrderEvent(ctx, 'order.delete', {
                    id: deleted.id,
                })

                return apiResponseOkWrapper(ctx, { data: deleted })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'ORDER_DELETE_FAILED',
                        message: 'Order deletion failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .post('/proof/upload', async (ctx) => {
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

        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
        const hashHex = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('')

        const { objectStorage: objectStorageTable } = ctx.get('dbSchema')

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

        if (existing?.isUploaded) {
            objectId = existing.id
        } else {
            try {
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
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'PROOF_UPLOAD_FAILED',
                        message: 'Proof of payment upload failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        }

        await auditTrailLogger(ctx, {
            component: 'admin.order',
            action: 'proof.upload',
            description: 'Admin uploaded order proof of payment',
            records: { table: 'object_storage', id: objectId },
        })

        return apiResponseOkWrapper(ctx, {
            data: {
                objectStorageId: objectId,
                proofOfPaymentUrl: `${ctx.env.URL_BACKEND}/api/image/view/${objectId}`,
            },
        })
    })
    .post(
        '/proof/updateStatus',
        validateRequest('json', order.updateProofStatusInputSchema),
        async (ctx) => {
            const { orderId, proofType, status, fakeReason } =
                ctx.req.valid('json')

            const { order: orderTable } = ctx.get('dbSchema')

            const [existingOrder] = await ctx
                .get('dbClient')
                .select({
                    proofOfPaymentObjectStorageId:
                        orderTable.proofOfPaymentObjectStorageId,
                    remainingBalanceProofObjectStorageId:
                        orderTable.remainingBalanceProofObjectStorageId,
                })
                .from(orderTable)
                .where(eq(orderTable.id, orderId))
                .limit(1)

            if (!existingOrder) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'Order not found.',
                    status: 404,
                })
            }

            try {
                const reason = status === 'fake' ? (fakeReason ?? null) : null

                const setFields =
                    proofType === 'downpayment'
                        ? {
                              proofOfPaymentStatus: status,
                              proofOfPaymentFakeReason: reason,
                          }
                        : {
                              remainingBalanceProofStatus: status,
                              remainingBalanceProofFakeReason: reason,
                          }

                const [updated] = await ctx
                    .get('dbClient')
                    .update(orderTable)
                    .set(setFields)
                    .where(eq(orderTable.id, orderId))
                    .returning({
                        id: orderTable.id,
                        publicId: orderTable.publicId,
                        trackingCode: orderTable.trackingCode,
                    })

                await auditTrailLogger(ctx, {
                    component: 'admin.order',
                    action: 'proof.updateStatus',
                    description: `Admin marked ${proofType} proof as ${status}`,
                    records: { table: 'order', id: String(updated.id) },
                })

                await broadcastOrderEvent(ctx, 'order.proofStatusUpdated', {
                    trackingCode: updated.trackingCode,
                    proofType,
                    status,
                    fakeReason: reason,
                })

                if (status === 'accepted' || status === 'fake') {
                    const objectId =
                        proofType === 'downpayment'
                            ? existingOrder.proofOfPaymentObjectStorageId
                            : existingOrder.remainingBalanceProofObjectStorageId
                    if (objectId) {
                        await deleteProofImageIfUnused(
                            ctx,
                            orderId,
                            objectId,
                        ).catch(() => undefined)
                    }
                }

                return apiResponseOkWrapper(ctx, {
                    data: { orderId, proofType, status },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'PROOF_STATUS_UPDATE_FAILED',
                        message: 'Proof status update failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )

export type AdminOrderRouteType = ApplyGlobalResponse<
    typeof orderRoute,
    TGlobalApiResponses
>

export default orderRoute
