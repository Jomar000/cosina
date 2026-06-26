import { order } from '@hyperion/validator/public/order'
import { asc, eq, inArray } from 'drizzle-orm'
import { type Context, Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import { AppError } from '../../../../errors.js'
import type { TGlobalApiResponses, THonoInstance } from '../../../../types.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
    auditTrailLogger,
    nanoidCustom,
    nanoidOrderCode,
} from '../../../../utilities/helpers.js'
import { validateRequest } from '../../../middleware/validateRequest.js'

async function broadcastOrderEvent(
    ctx: Context<THonoInstance>,
    event: string,
    data: unknown,
) {
    try {
        const id = ctx.get('doWssClient').idFromName('orders')
        const stub = ctx.get('doWssClient').get(id)
        await stub.sendMessage(JSON.stringify({ event, data }))
    } catch {
        // Non-fatal: WS broadcast failure should not abort the HTTP response
    }
}

export const orderRoute = new Hono<THonoInstance>()
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
                proofOfPaymentObjectStorageId,
                notes,
                deliveryAddress,
                items,
            } = ctx.req.valid('json')

            const organizationId = ctx.env.DEFAULT_ORGANIZATION_ID

            if (!organizationId) {
                throw new AppError({
                    status: 503,
                    code: 'SERVICE_UNAVAILABLE',
                    message: 'Ordering is currently unavailable.',
                })
            }

            const amountToPay = items
                .reduce(
                    (sum, item) => sum + parseFloat(item.price) * item.quantity,
                    0,
                )
                .toFixed(2)

            const { order: orderTable, orderItem } = ctx.get('dbSchema')

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
                                deliveryAddress: deliveryAddress ?? null,
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
                                downpayment: orderTable.downpayment,
                                amountToPay: orderTable.amountToPay,
                                proofOfPaymentObjectStorageId:
                                    orderTable.proofOfPaymentObjectStorageId,
                                status: orderTable.status,
                                notes: orderTable.notes,
                                createdAt: orderTable.createdAt,
                            })

                        const insertedItems = await tx
                            .insert(orderItem)
                            .values(
                                items.map((item) => ({
                                    orderId: created.id,
                                    productId: item.productId ?? null,
                                    name: item.name,
                                    sizeName: item.sizeName ?? null,
                                    quantity: item.quantity,
                                    price: item.price,
                                })),
                            )
                            .returning({
                                id: orderItem.id,
                                productId: orderItem.productId,
                                name: orderItem.name,
                                sizeName: orderItem.sizeName,
                                quantity: orderItem.quantity,
                                price: orderItem.price,
                            })

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'order',
                                action: 'create',
                                description: `Customer ${customerName} placed an order`,
                                records: {
                                    table: 'order',
                                    id: String(created.id),
                                },
                            },
                            tx,
                        )

                        return {
                            ...created,
                            proofOfPaymentUrl:
                                created.proofOfPaymentObjectStorageId
                                    ? `${ctx.env.URL_BACKEND}/api/image/view/${created.proofOfPaymentObjectStorageId}`
                                    : null,
                            items: insertedItems,
                        }
                    })

                console.log(
                    JSON.stringify({
                        type: 'ORDER_CREATED',
                        requestId: ctx.get('requestId'),
                        orderId: data.id,
                        customerName,
                        deliveryType,
                        amountToPay,
                    }),
                )

                await broadcastOrderEvent(ctx, 'order.create', data)

                return apiResponseOkWrapper(ctx, { data })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'ORDER_CREATE_FAILED',
                        message: 'Order placement failed.',
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
            component: 'order',
            action: 'proof.upload',
            description: 'Customer uploaded proof of payment',
            records: { table: 'object_storage', id: objectId },
        })

        return apiResponseOkWrapper(ctx, {
            data: {
                objectStorageId: objectId,
                proofOfPaymentUrl: `${ctx.env.URL_BACKEND}/api/image/view/${objectId}`,
            },
        })
    })

const ADVANCE_DAYS_KEY = 'order:settings:advanceDays'
const DEFAULT_ADVANCE_DAYS = 3
const RESTAURANT_ADDRESS_KEY = 'order:settings:restaurantAddress'
const CLOSING_DAYS_KEY = 'order:settings:closingDays'
const GCASH_ACCOUNT_NAME_KEY = 'order:settings:gcashAccountName'
const GCASH_NUMBER_KEY = 'order:settings:gcashNumber'
const PAYMENT_INSTRUCTIONS_KEY = 'order:settings:paymentInstructions'

type TClosingDayItem = {
    id: string
    startDate: string
    endDate: string
    reason?: string
}

function parseClosingDays(raw: string | null | undefined): TClosingDayItem[] {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed as TClosingDayItem[]
    } catch {
        // ignore
    }
    return []
}

export const trackOrderRoute = orderRoute
    .get('/settings', async (ctx) => {
        const { keyValue } = ctx.get('dbSchema')

        try {
            const rows = await ctx
                .get('dbClient')
                .select({ key: keyValue.key, value: keyValue.value })
                .from(keyValue)
                .where(
                    inArray(keyValue.key, [
                        ADVANCE_DAYS_KEY,
                        RESTAURANT_ADDRESS_KEY,
                        CLOSING_DAYS_KEY,
                        GCASH_ACCOUNT_NAME_KEY,
                        GCASH_NUMBER_KEY,
                        PAYMENT_INSTRUCTIONS_KEY,
                    ]),
                )

            const byKey = Object.fromEntries(
                rows.map((r) => [
                    r.key,
                    r.value,
                ]),
            )

            const advanceDays = byKey[ADVANCE_DAYS_KEY]
                ? parseInt(byKey[ADVANCE_DAYS_KEY]!, 10)
                : DEFAULT_ADVANCE_DAYS

            const restaurantAddress = byKey[RESTAURANT_ADDRESS_KEY] ?? null
            const closingDays = parseClosingDays(byKey[CLOSING_DAYS_KEY])
            const gcashAccountName = byKey[GCASH_ACCOUNT_NAME_KEY] ?? null
            const gcashNumber = byKey[GCASH_NUMBER_KEY] ?? null
            const paymentInstructions = byKey[PAYMENT_INSTRUCTIONS_KEY] ?? null

            return apiResponseOkWrapper(ctx, {
                data: {
                    advanceDays,
                    restaurantAddress,
                    closingDays,
                    gcashAccountName,
                    gcashNumber,
                    paymentInstructions,
                },
            })
        } catch (err) {
            console.error(
                '[order/settings] Failed to fetch settings, returning defaults',
                err,
            )
            return apiResponseOkWrapper(ctx, {
                data: {
                    advanceDays: DEFAULT_ADVANCE_DAYS,
                    restaurantAddress: null,
                    closingDays: [],
                    gcashAccountName: null,
                    gcashNumber: null,
                    paymentInstructions: null,
                },
            })
        }
    })
    .get(
        '/track',
        validateRequest('query', order.trackInputSchema),
        async (ctx) => {
            const { trackingCode } = ctx.req.valid('query')
            const { order: orderTable, orderItem: orderItemTable } =
                ctx.get('dbSchema')

            const [row] = await ctx
                .get('dbClient')
                .select({
                    id: orderTable.id,
                    trackingCode: orderTable.trackingCode,
                    customerName: orderTable.customerName,
                    deliveryType: orderTable.deliveryType,
                    deliveryAt: orderTable.deliveryAt,
                    downpayment: orderTable.downpayment,
                    amountToPay: orderTable.amountToPay,
                    status: orderTable.status,
                    notes: orderTable.notes,
                    createdAt: orderTable.createdAt,
                    remainingBalancePaymentMethod:
                        orderTable.remainingBalancePaymentMethod,
                    proofOfPaymentStatus: orderTable.proofOfPaymentStatus,
                    remainingBalanceProofStatus:
                        orderTable.remainingBalanceProofStatus,
                })
                .from(orderTable)
                .where(eq(orderTable.trackingCode, trackingCode))
                .limit(1)

            if (!row) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message:
                        'Order not found. Please check your Tracking Code.',
                    status: 404,
                })
            }

            const items = await ctx
                .get('dbClient')
                .select({
                    id: orderItemTable.id,
                    name: orderItemTable.name,
                    sizeName: orderItemTable.sizeName,
                    quantity: orderItemTable.quantity,
                    price: orderItemTable.price,
                })
                .from(orderItemTable)
                .where(eq(orderItemTable.orderId, row.id))
                .orderBy(asc(orderItemTable.id))

            return apiResponseOkWrapper(ctx, { data: { ...row, items } })
        },
    )
    .post(
        '/remaining-balance/submit',
        validateRequest('json', order.submitRemainingBalanceInputSchema),
        async (ctx) => {
            const {
                trackingCode,
                paymentMethod,
                proofObjectStorageId,
                senderName,
                senderNumber,
                amountSent,
            } = ctx.req.valid('json')

            if (paymentMethod === 'gcash') {
                if (!proofObjectStorageId) {
                    return apiResponseErrorWrapper(ctx, {
                        code: 'PROOF_REQUIRED',
                        message:
                            'A proof of payment screenshot is required for GCash payments.',
                        status: 400,
                    })
                }
                if (!senderName || !senderNumber || !amountSent) {
                    return apiResponseErrorWrapper(ctx, {
                        code: 'SENDER_INFO_REQUIRED',
                        message:
                            'Your GCash name, number, and the amount you sent are required.',
                        status: 400,
                    })
                }
            }

            const { order: orderTable } = ctx.get('dbSchema')

            const [existing] = await ctx
                .get('dbClient')
                .select({
                    id: orderTable.id,
                    status: orderTable.status,
                    remainingBalancePaymentMethod:
                        orderTable.remainingBalancePaymentMethod,
                })
                .from(orderTable)
                .where(eq(orderTable.trackingCode, trackingCode))
                .limit(1)

            if (!existing) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message:
                        'Order not found. Please check your Tracking Code.',
                    status: 404,
                })
            }

            if (existing.status === 'cancelled') {
                return apiResponseErrorWrapper(ctx, {
                    code: 'ORDER_CANCELLED',
                    message:
                        'This order has been cancelled and cannot accept payment.',
                    status: 409,
                })
            }

            if (existing.remainingBalancePaymentMethod !== null) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'ALREADY_SUBMITTED',
                    message:
                        'A remaining balance payment has already been submitted for this order.',
                    status: 409,
                })
            }

            try {
                await ctx
                    .get('dbClient')
                    .update(orderTable)
                    .set({
                        remainingBalancePaymentMethod: paymentMethod,
                        remainingBalanceProofObjectStorageId:
                            proofObjectStorageId ?? null,
                        remainingBalanceSenderName: senderName ?? null,
                        remainingBalanceSenderNumber: senderNumber ?? null,
                        remainingBalanceAmountSent: amountSent ?? null,
                        updatedAt: new Date(),
                    })
                    .where(eq(orderTable.id, existing.id))

                console.log(
                    JSON.stringify({
                        type: 'REMAINING_BALANCE_SUBMITTED',
                        requestId: ctx.get('requestId'),
                        orderId: existing.id,
                        paymentMethod,
                    }),
                )

                await broadcastOrderEvent(ctx, 'order.remainingBalanceSubmit', {
                    id: existing.id,
                    trackingCode,
                    paymentMethod,
                })

                await auditTrailLogger(ctx, {
                    component: 'order',
                    action: 'remainingBalance.submit',
                    description: `Customer submitted remaining balance payment via ${paymentMethod}`,
                    records: { table: 'order', id: String(existing.id) },
                })

                return apiResponseOkWrapper(ctx, {
                    data: { trackingCode, paymentMethod },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'REMAINING_BALANCE_SUBMIT_FAILED',
                        message: 'Failed to submit remaining balance payment.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )

export default trackOrderRoute
export type OrderRouteType = ApplyGlobalResponse<
    typeof trackOrderRoute,
    TGlobalApiResponses
>
