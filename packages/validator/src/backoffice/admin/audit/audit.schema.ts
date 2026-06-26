import { z } from 'zod'

import * as base from '../../../shared/base.js'
import * as field from '../../../shared/field.js'

export const readManyInputSchema = base.readManyInputSchema
    .extend({
        component: field.vText({ fieldName: 'Component', max: 128 }).optional(),
        action: field.vText({ fieldName: 'Action', max: 128 }).optional(),
    })
    .extend({
        limit: z.coerce.number().int().min(1).max(200).optional().default(50),
    })
