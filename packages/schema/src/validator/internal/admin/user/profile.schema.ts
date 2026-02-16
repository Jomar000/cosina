import { z } from 'zod'

import * as base from '../../../shared/base.js'
import * as field from '../../../shared/field.js'
import * as profile from '../../user/profile.schema.js'

export const readInputSchema = z.object({
    userId: field.vText({ fieldName: 'User ID' }),
})

export const readManyInputSchema = base.readManyInputSchema

export const updateInputSchema = profile.updateInputSchema.extend({
    userId: field.vText({ fieldName: 'User ID' }),
})

export const updateAddressInputSchema = base.addressInputSchema.extend({
    userId: field.vText({ fieldName: 'User ID' }),
})
