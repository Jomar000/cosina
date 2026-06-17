import { z } from 'zod'

import * as field from '../../../shared/field.js'

export const updateSettingsInputSchema = z.object({
    advanceDays: field.vInt({
        fieldName: 'Advance Days',
        min: 1,
        max: 30,
    }),
    restaurantAddress: z.string().trim().max(512).optional(),
})
