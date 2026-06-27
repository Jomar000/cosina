import { z } from 'zod'

import * as base from '../../../shared/base.js'
import * as field from '../../../shared/field.js'

export const orderStatusEnum = z.enum(
    [
        'pending',
        'cooking',
        'looking_for_rider',
        'ready_to_pick_up',
        'rider_is_on_the_way',
        'completed',
        'cancelled',
    ],
    {
        error: () => ({
            message:
                'Status must be pending, cooking, looking_for_rider, ready_to_pick_up, rider_is_on_the_way, completed, or cancelled.',
        }),
    },
)

export const deliveryTypeEnum = z.enum(
    [
        'self_pickup',
        'lalamove',
        'other_courier',
    ],
    {
        error: () => ({
            message:
                'Delivery type must be self_pickup, lalamove, or other_courier.',
        }),
    },
)

export const orderItemInputSchema = z.object({
    productId: field.vInt({ fieldName: 'Product ID', min: 1 }).optional(),
    name: field.vText({ fieldName: 'Item Name', max: 128 }),
    sizeName: field.vText({ fieldName: 'Size Name', max: 64 }).optional(),
    flavorName: field.vText({ fieldName: 'Flavor Name', max: 64 }).optional(),
    quantity: field.vInt({ fieldName: 'Quantity', min: 1 }),
    price: field.vNumeric({ fieldName: 'Price', min: 0 }),
})

export const readInputSchema = z.object({
    orderId: field.vInt({ fieldName: 'Order ID', min: 1 }),
})

export const readManyInputSchema = base.readManyInputSchema
    .extend({
        status: orderStatusEnum.optional(),
    })
    .extend({
        limit: z.coerce.number().int().min(1).max(500).optional().default(100),
    })

export const createInputSchema = z.object({
    customerName: field.vText({ fieldName: 'Customer Name', max: 128 }),
    contactNumber: field.vText({ fieldName: 'Contact Number', max: 32 }),
    contactNumber2: field
        .vText({ fieldName: 'Contact Number 2', max: 32 })
        .optional(),
    deliveryType: deliveryTypeEnum,
    deliveryAt: z.string().datetime({ offset: true }).optional(),
    downpayment: field
        .vNumeric({ fieldName: 'Downpayment', min: 0 })
        .optional(),
    amountToPay: field.vNumeric({ fieldName: 'Amount to Pay', min: 0 }),
    proofOfPaymentObjectStorageId: z
        .string()
        .min(1)
        .max(64)
        .nullable()
        .optional(),
    notes: field.vText({ fieldName: 'Notes', min: 0, max: 512 }).optional(),
    items: z.array(orderItemInputSchema).optional().default([]),
})

export const updateInputSchema = z.object({
    orderId: field.vInt({ fieldName: 'Order ID', min: 1 }),
    customerName: field
        .vText({ fieldName: 'Customer Name', max: 128 })
        .optional(),
    contactNumber: field
        .vText({ fieldName: 'Contact Number', max: 32 })
        .optional(),
    contactNumber2: field
        .vText({ fieldName: 'Contact Number 2', max: 32 })
        .nullable()
        .optional(),
    deliveryType: deliveryTypeEnum.optional(),
    deliveryAt: z.string().datetime({ offset: true }).nullable().optional(),
    downpayment: field
        .vNumeric({ fieldName: 'Downpayment', min: 0 })
        .nullable()
        .optional(),
    amountToPay: field
        .vNumeric({ fieldName: 'Amount to Pay', min: 0 })
        .optional(),
    proofOfPaymentObjectStorageId: z
        .string()
        .min(1)
        .max(64)
        .nullable()
        .optional(),
    notes: field
        .vText({ fieldName: 'Notes', min: 0, max: 512 })
        .nullable()
        .optional(),
    items: z.array(orderItemInputSchema).optional(),
})

export const updateStatusInputSchema = z.object({
    orderId: field.vInt({ fieldName: 'Order ID', min: 1 }),
    status: orderStatusEnum,
})

export const proofStatusEnum = z.enum([
    'accepted',
    'fake',
    'received',
])

export const updateProofStatusInputSchema = z.object({
    orderId: field.vInt({ fieldName: 'Order ID', min: 1 }),
    proofType: z.enum([
        'downpayment',
        'remaining_balance',
    ]),
    status: proofStatusEnum,
    fakeReason: field
        .vText({ fieldName: 'Reason', max: 512 })
        .nullable()
        .optional(),
})

export const deleteInputSchema = z.object({
    orderId: field.vInt({ fieldName: 'Order ID', min: 1 }),
})
