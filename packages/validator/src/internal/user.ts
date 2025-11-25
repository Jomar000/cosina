import { z } from 'zod'

import { baseAddressInputSchema, textField } from '../shared.js'

export const userProfileUpdateInputSchema = z.object({
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

export const userProfileAddressUpdateInputSchema = baseAddressInputSchema
