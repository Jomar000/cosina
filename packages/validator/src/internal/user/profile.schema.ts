import { z } from 'zod'

import { base, field } from '../../shared/index.js'

export const updateInputSchema = z.object({
    firstName: field.vText({ fieldName: 'First Name' }).uppercase(),
    middleName: field
        .vText({ fieldName: 'Middle Name' })
        .uppercase()
        .optional(),
    lastName: field.vText({ fieldName: 'Last Name' }).uppercase(),
    nameExtension: field.vText({ fieldName: 'Name Extension' }).uppercase(),
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
    backupPhoneNumber: field
        .vText({
            fieldName: 'Backup Phone Number',
        })
        .uppercase(),
})

export const addressUpdateInputSchema = base.addressInputSchema
