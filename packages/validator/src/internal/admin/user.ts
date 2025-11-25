import { z } from 'zod'

import {
    baseAddressInputSchema,
    readManyBaseInputSchema,
    textField,
} from '../../shared.js'
import { userProfileUpdateInputSchema as baseUserProfileUpdateInputSchema } from '../user.js'

export const userProfileReadInputSchema = z.object({
    userId: textField({ fieldName: 'User ID' }),
})

export const userProfileReadManyInputSchema = readManyBaseInputSchema

export const userProfileUpdateInputSchema =
    baseUserProfileUpdateInputSchema.extend({
        userId: textField({ fieldName: 'User ID' }),
    })

export const userProfileAddressUpdateInputSchema =
    baseAddressInputSchema.extend({
        userId: textField({ fieldName: 'User ID' }),
    })
