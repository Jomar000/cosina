import { z } from 'zod'

import * as field from '../../../shared/field.js'
import * as refinement from '../../../shared/refinement.js'

export const resetRequestInputSchema = z.object({
    userId: field.vText({ fieldName: 'User ID' }),
})

export const resetInputSchema = z.object({
    userId: field.vText({ fieldName: 'User ID' }),
    newPassword: field
        .vText({
            fieldName: 'New Password',
            min: 12,
            max: 128,
        })
        .check(refinement.password()),
})
