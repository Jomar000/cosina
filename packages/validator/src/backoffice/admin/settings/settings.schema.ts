import { z } from 'zod'

import * as field from '../../../shared/field.js'

const isoDateString = z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a date in YYYY-MM-DD format')

export const closingDayItemSchema = z.object({
    id: z.string().min(1).max(36),
    startDate: isoDateString,
    endDate: isoDateString,
    reason: z.string().trim().max(128).optional(),
})

export const closingDaysArraySchema = z.array(closingDayItemSchema).max(52)

export const updateClosingDaysInputSchema = z.object({
    closingDays: closingDaysArraySchema,
})

export type TClosingDayItem = z.infer<typeof closingDayItemSchema>

export const updateSettingsInputSchema = z.object({
    advanceDays: field.vInt({
        fieldName: 'Advance Days',
        min: 1,
        max: 30,
    }),
    restaurantAddress: z.string().trim().max(512).optional(),
    gcashAccountName: z.string().trim().max(128).optional(),
    gcashNumber: z.string().trim().max(32).optional(),
    paymentInstructions: z.string().trim().max(512).optional(),
})
