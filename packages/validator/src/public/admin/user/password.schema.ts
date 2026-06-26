import { z } from 'zod'

import * as base from '../../../shared/base.js'
import * as field from '../../../shared/field.js'
import * as refinement from '../../../shared/refinement.js'

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

export const resetOutputSchema = base.outputSchema(z.null())

export const resetRequestInputSchema = z.object({
    userId: field.vText({ fieldName: 'User ID' }),
})

export const resetRequestOutputSchema = base.outputSchema(z.null())
