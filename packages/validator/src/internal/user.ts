import { z } from 'zod'

import {
    baseAddressInputSchema,
    readManyBaseInputSchema,
    textField,
} from '../shared.js'

export const userProfileReadInputSchema = z.object({
    userId: textField({ fieldName: 'User ID' }),
})

export const userProfileReadManyInputSchema = readManyBaseInputSchema.extend({
    userId: textField({ fieldName: 'User ID' }),
})

export const userProfileUpdateInputSchema = z.object({
    userId: textField({ fieldName: 'User ID' }),
    firstName: textField({ fieldName: 'First Name' }).uppercase(),
    middleName: textField({ fieldName: 'Middle Name' }).uppercase().optional(),
    lastName: textField({ fieldName: 'Last Name' }).uppercase(),
    nameExtension: textField({ fieldName: 'Name Extension' }).uppercase(),
    gender: z.enum(
        [
            'MALE',
            'FEMALE',
        ],
        {
            error: (issue) => {
                switch (issue.code) {
                    case 'invalid_value':
                        return {
                            message: 'Provided gender is not in the choices.',
                        }
                    default:
                        return { message: 'Invalid gender provided.' }
                }
            },
        },
    ),
    backupPhoneNumber: textField({
        fieldName: 'Backup Phone Number',
    }).uppercase(),
})

export const userProfileAddressUpdateInputSchema = z.object({
    userId: textField({ fieldName: 'User ID' }),
    ...baseAddressInputSchema.shape,
})
