import { z } from 'zod'

import * as base from '../../../shared/base.js'
import * as field from '../../../shared/field.js'

export const feedbackStatusSchema = z.enum(
    [
        'pending',
        'published',
        'rejected',
    ],
    {
        error: () => ({
            message: 'Status must be pending, published, or rejected.',
        }),
    },
)

export const readManyInputSchema = base.readManyInputSchema.extend({
    status: feedbackStatusSchema.optional(),
})

export const readManyOutputSchema = base.paginatedOutputSchema(
    base.objectArrayOutputDataSchema,
)

export const updateStatusInputSchema = z.object({
    feedbackId: field.vInt({ fieldName: 'Feedback ID', min: 1 }),
    status: feedbackStatusSchema,
})

export const updateStatusOutputSchema = base.outputSchema(
    base.objectOutputDataSchema,
)

export type TReadManyInput = z.infer<typeof readManyInputSchema>
export type TUpdateStatusInput = z.infer<typeof updateStatusInputSchema>
