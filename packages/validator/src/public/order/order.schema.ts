import { z } from 'zod'

import * as field from '../../shared/field.js'

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
    name: field.vText({ fieldName: 'Product Name', max: 128 }),
    sizeName: field
        .vText({ fieldName: 'Size Name', max: 64, min: 0 })
        .optional(),
    quantity: field.vInt({ fieldName: 'Quantity', min: 1, max: 100 }),
    price: field.vNumeric({ fieldName: 'Price', min: 0 }),
})

export const trackInputSchema = z.object({
    trackingCode: field.vText({ fieldName: 'Tracking Code', min: 1, max: 20 }),
})

export const createInputSchema = z.object({
    customerName: field.vText({ fieldName: 'Customer Name', max: 128 }),
    contactNumber: field.vText({ fieldName: 'Contact Number', max: 20 }),
    contactNumber2: z.string().trim().max(20).min(1).optional(),
    deliveryType: deliveryTypeEnum,
    deliveryAt: z.string().datetime({ offset: true }).optional(),
    downpayment: field
        .vNumeric({ fieldName: 'Downpayment', min: 0 })
        .optional(),
    proofOfPaymentObjectStorageId: z.string().trim().min(1).max(64).optional(),
    notes: z.string().trim().max(512).optional(),
    items: z
        .array(orderItemInputSchema)
        .min(1, { error: 'Order must have at least one item.' }),
})
