import { z } from 'zod'

import * as base from '../../../shared/base.js'
import * as field from '../../../shared/field.js'
import * as profile from '../../user/profile.schema.js'

export const readInputSchema = z.object({
    userId: field.vText({ fieldName: 'User ID' }),
})

export const readOutputSchema = base.outputSchema(base.objectOutputDataSchema)

export const readManyInputSchema = base.readManyInputSchema

export const readManyOutputSchema = base.outputSchema(
    base.objectArrayOutputDataSchema,
)

export const updateInputSchema = profile.updateInputSchema.extend({
    userId: field.vText({ fieldName: 'User ID' }),
})

export const updateOutputSchema = base.outputSchema(base.objectOutputDataSchema)

export const updateAddressInputSchema = base.addressInputSchema.extend({
    userId: field.vText({ fieldName: 'User ID' }),
})

export const updateAddressOutputSchema = base.outputSchema(
    base.objectOutputDataSchema,
)
