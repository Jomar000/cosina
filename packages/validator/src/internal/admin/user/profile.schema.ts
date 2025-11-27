import { z } from 'zod'

import { base, field } from '../../../shared/index.js'
import { profile } from '../../user/index.js'

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
