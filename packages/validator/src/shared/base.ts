import type { TValidatorIssue } from '@hyperion/types/shared'
import { z } from 'zod'

import { vText } from './field.js'

export const addressInputSchema = z.object({
    line1: vText({ fieldName: 'Address Line 1' }).uppercase(),
    line2: vText({ fieldName: 'Address Line 2' }).uppercase().optional(),
    cityMunicipality: vText({ fieldName: 'City/Municipality' }).uppercase(),
    provinceStateRegion: vText({
        fieldName: 'Province/State/Region',
    }).uppercase(),
    postalCode: vText({ fieldName: 'Postal Code' }).uppercase(),
    countryCode: vText({ fieldName: 'Country Code' }).uppercase(),
})

export const outputSchema = <Data extends z.ZodType = z.ZodType>(data: Data) =>
    z.union([
        z.object({
            success: z.literal(true),
            data,
            error: z.null().optional(),
            count: z.number().optional(),
            limit: z.number().optional(),
            offset: z.number().optional(),
        }),
        z.object({
            success: z.literal(false),
            data: z.null().optional(),
            error: z.object({
                requestId: z.string(),
                code: z.string(),
                message: z.string(),
                validatorIssues: z
                    .array(z.custom<TValidatorIssue>())
                    .optional(),
            }),
        }),
    ])

export const readManyInputSchema = z.object({
    limit: z.coerce
        .number({
            error: 'Limit must be a number or a string that can be cast as a number.',
        })
        .check((ctx) => {
            if (!Number.isInteger(ctx.value)) {
                ctx.issues.push({
                    code: 'custom',
                    message: 'Limit must be an integer.',
                    input: ctx.value,
                })
            }
        })
        .min(1, { error: 'Limit must be greater than or equal to 1.' })
        .max(100, { error: 'Limit must be less than or equal to 100.' })
        .optional()
        .default(100),
    offset: z.coerce
        .number({
            error: 'Offset must be a number or a string that can be cast as a number.',
        })
        .check((ctx) => {
            if (!Number.isInteger(ctx.value)) {
                ctx.issues.push({
                    code: 'custom',
                    message: 'Offset must be an integer.',
                    input: ctx.value,
                })
            }
        })
        .gte(0, { error: 'Offset must be greater than or equal to 0.' })
        .optional()
        .default(0),
    sortOrder: z
        .enum(
            [
                'asc',
                'desc',
            ],
            {
                error: (issue) => {
                    switch (issue.code) {
                        case 'invalid_value':
                            return {
                                message:
                                    'Provided sort order is not in the choices.',
                            }
                        default:
                            return { message: 'Invalid sort order provided.' }
                    }
                },
            },
        )
        .optional()
        .default('asc'),
})
