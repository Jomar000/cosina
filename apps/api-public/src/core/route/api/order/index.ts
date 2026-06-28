import { order } from '@cosina/validator/public/order'
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
    const payload = JSON.stringify({ event, data })

    // Broadcast to public DO (customer tracking page WS clients)
    try {
        const id = ctx.get('doWssClient').idFromName('orders')
        const stub = ctx.get('doWssClient').get(id)
        await stub.sendMessage(payload)
    } catch {
        // Non-fatal
    }

    // Broadcast to backoffice DO (admin orders WS clients)
    try {
        const id = ctx.env.COSINABOFC_DO_WSS.idFromName('orders')
        const stub = ctx.env.COSINABOFC_DO_WSS.get(id)
        await stub.sendMessage(payload)
    } catch {
        // Non-fatal
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
                                    flavorName: item.flavorName ?? null,
                                    quantity: item.quantity,
                                    price: item.price,
                                })),
                            )
                            .returning({
                                id: orderItem.id,
                                productId: orderItem.productId,
                                name: orderItem.name,
                                sizeName: orderItem.sizeName,
                                flavorName: orderItem.flavorName,
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
                    code: 'PROOF_UPLOAD_FAILED',
                    message: 'Proof of payment upload failed.',
                },
                err instanceof Error ? err : undefined,
            )
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
                    proofOfPaymentObjectStorageId:
                        orderTable.proofOfPaymentObjectStorageId,
                    proofOfPaymentStatus: orderTable.proofOfPaymentStatus,
                    proofOfPaymentFakeReason:
                        orderTable.proofOfPaymentFakeReason,
                    remainingBalanceProofStatus:
                        orderTable.remainingBalanceProofStatus,
                    remainingBalanceProofFakeReason:
                        orderTable.remainingBalanceProofFakeReason,
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
                    flavorName: orderItemTable.flavorName,
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
                    customerName: orderTable.customerName,
                    status: orderTable.status,
                    remainingBalancePaymentMethod:
                        orderTable.remainingBalancePaymentMethod,
                    remainingBalanceProofStatus:
                        orderTable.remainingBalanceProofStatus,
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

            if (
                existing.remainingBalancePaymentMethod !== null &&
                existing.remainingBalanceProofStatus !== 'fake'
            ) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'ALREADY_SUBMITTED',
                    message:
                        'A remaining balance payment has already been submitted for this order.',
                    status: 409,
                })
            }

            const isResubmit = existing.remainingBalanceProofStatus === 'fake'

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
                        remainingBalanceProofStatus: null,
                        remainingBalanceProofFakeReason: null,
                        updatedAt: new Date(),
                    })
                    .where(eq(orderTable.id, existing.id))

                console.log(
                    JSON.stringify({
                        type: isResubmit
                            ? 'REMAINING_BALANCE_RESUBMITTED'
                            : 'REMAINING_BALANCE_SUBMITTED',
                        requestId: ctx.get('requestId'),
                        orderId: existing.id,
                        paymentMethod,
                    }),
                )

                await broadcastOrderEvent(ctx, 'order.remainingBalanceSubmit', {
                    id: existing.id,
                    trackingCode,
                    customerName: existing.customerName,
                    paymentMethod,
                })

                await auditTrailLogger(ctx, {
                    component: 'order',
                    action: isResubmit
                        ? 'remainingBalance.resubmit'
                        : 'remainingBalance.submit',
                    description: isResubmit
                        ? `Customer resubmitted remaining balance payment via ${paymentMethod} after rejection`
                        : `Customer submitted remaining balance payment via ${paymentMethod}`,
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
    .post(
        '/proof/downpayment/resubmit',
        validateRequest('json', order.resubmitDownpaymentProofInputSchema),
        async (ctx) => {
            const { trackingCode, objectStorageId } = ctx.req.valid('json')
            const { order: orderTable } = ctx.get('dbSchema')

            const [existing] = await ctx
                .get('dbClient')
                .select({
                    id: orderTable.id,
                    customerName: orderTable.customerName,
                    proofOfPaymentStatus: orderTable.proofOfPaymentStatus,
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

            if (existing.proofOfPaymentStatus !== 'fake') {
                return apiResponseErrorWrapper(ctx, {
                    code: 'INVALID_STATUS',
                    message:
                        'Your downpayment proof has not been rejected and cannot be resubmitted.',
                    status: 409,
                })
            }

            await ctx
                .get('dbClient')
                .update(orderTable)
                .set({
                    proofOfPaymentObjectStorageId: objectStorageId,
                    proofOfPaymentStatus: null,
                    proofOfPaymentFakeReason: null,
                    updatedAt: new Date(),
                })
                .where(eq(orderTable.id, existing.id))

            await broadcastOrderEvent(ctx, 'order.proofResubmit', {
                id: existing.id,
                trackingCode,
                customerName: existing.customerName,
                proofType: 'downpayment',
            })

            await auditTrailLogger(ctx, {
                component: 'order',
                action: 'proof.resubmit',
                description:
                    'Customer resubmitted downpayment proof after rejection',
                records: { table: 'order', id: String(existing.id) },
            })

            return apiResponseOkWrapper(ctx, { data: { trackingCode } })
        },
    )

export default trackOrderRoute
export type OrderRouteType = ApplyGlobalResponse<
    typeof trackOrderRoute,
    TGlobalApiResponses
>
