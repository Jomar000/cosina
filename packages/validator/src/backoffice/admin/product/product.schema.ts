import { z } from 'zod'

import * as base from '../../../shared/base.js'
import * as field from '../../../shared/field.js'

export const categoryEnum = z.enum(
    [
        'bilao_package',
        'bundle_package',
        'single_order',
    ],
    {
        error: () => ({
            message:
                'Category must be bilao_package, bundle_package, or single_order.',
        }),
    },
)

export const sizeItemSchema = z.object({
    name: field.vText({ fieldName: 'Size Name', max: 64 }),
    price: field.vNumeric({ fieldName: 'Size Price', min: 0 }),
})

export const readInputSchema = z.object({
    productId: field.vInt({ fieldName: 'Product ID', min: 1 }),
})

export const readManyInputSchema = base.readManyInputSchema

export const createInputSchema = z.object({
    name: field.vText({ fieldName: 'Product Name', max: 128 }),
    ingredients: field
        .vText({ fieldName: 'Ingredients', min: 0, max: 512 })
        .optional(),
    category: categoryEnum,
    price: field.vNumeric({ fieldName: 'Price', min: 0 }),
    imageObjectStorageId: z.string().min(1).max(64).nullable().optional(),
    isAvailable: field.vBoolean('Status'),
    sizes: z.array(sizeItemSchema).optional().default([]),
})

export const updateInputSchema = z.object({
    productId: field.vInt({ fieldName: 'Product ID', min: 1 }),
    name: field.vText({ fieldName: 'Product Name', max: 128 }).optional(),
    ingredients: field
        .vText({ fieldName: 'Ingredients', min: 0, max: 512 })
        .optional(),
    category: categoryEnum.optional(),
    price: field.vNumeric({ fieldName: 'Price', min: 0 }).optional(),
    imageObjectStorageId: z.string().min(1).max(64).nullable().optional(),
    isAvailable: field.vBoolean('Status').optional(),
    sizes: z.array(sizeItemSchema).optional(),
})

export const deleteInputSchema = z.object({
    productId: field.vInt({ fieldName: 'Product ID', min: 1 }),
})
