import { z } from 'zod'

export const statsInputSchema = z.object({
    period: z.enum([
        'day',
        'week',
        'month',
    ]),
})
