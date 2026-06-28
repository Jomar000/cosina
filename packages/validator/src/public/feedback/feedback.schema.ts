import { z } from 'zod'

import * as base from '../../shared/base.js'
import * as field from '../../shared/field.js'

export const ratingSchema = z.coerce
    .number({
        error: 'Rating must be a number between 1 and 5.',
    })
    .int({ error: 'Rating must be an integer.' })
    .min(1, 'Rating must be at least 1.')
    .max(5, 'Rating must be at most 5.')

export const createInputSchema = z.object({
    customerName: z
        .string({ error: 'Name is required.' })
        .trim()
        .min(2, 'Name must be at least 2 characters.')
        .max(100, 'Name must be 100 characters or less.'),
    rating: ratingSchema,
    comment: z
        .string()
        .trim()
        .max(512, 'Comment must be 512 characters or less.')
        .optional(),
})

export const createOutputSchema = base.outputSchema(base.objectOutputDataSchema)

export const readManyInputSchema = base.readManyInputSchema

export const readManyOutputSchema = base.paginatedOutputSchema(
    base.objectArrayOutputDataSchema,
)

export const readMineInputSchema = base.readManyInputSchema

export const readMineOutputSchema = base.paginatedOutputSchema(
    base.objectArrayOutputDataSchema,
)

export type TCreateInput = z.infer<typeof createInputSchema>
export type TReadManyInput = z.infer<typeof readManyInputSchema>
export type TReadMineInput = z.infer<typeof readMineInputSchema>

export const feedbackIdInputSchema = z.object({
    feedbackId: field.vInt({ fieldName: 'Feedback ID', min: 1 }),
})
