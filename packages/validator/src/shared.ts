import { z } from 'zod'

////////////
// Fields //
////////////

export const booleanField = (fieldName: string) =>
    z.coerce
        .string()
        .toLowerCase()
        .pipe(
            z.enum(
                [
                    'true',
                    'false',
                ],
                { error: `${fieldName} must be a boolean string.` },
            ),
        )
        .transform((field) => field === 'true')

export const intField = ({
    fieldName = 'Field',
    message = undefined,
    min = -2147483647,
    max = 2147483647,
}: {
    fieldName?: string
    message?: string
    min?: number
    max?: number
}) =>
    z
        .number({
            error: message
                ? message.replace('%f', fieldName)
                : `${fieldName} must be an integer.`,
        })
        .int({
            error: message
                ? message.replace('%f', fieldName)
                : `${fieldName} must be an integer.`,
        })
        .min(min, `${fieldName} must be greater than or equal to ${min}.`)
        .max(max, `${fieldName} must be less than or equal to ${max}.`)

export const numericField = ({
    fieldName = 'Field',
    message = undefined,
    min = Number.MIN_SAFE_INTEGER,
    max = Number.MAX_SAFE_INTEGER,
}: {
    fieldName?: string
    message?: string
    min?: number
    max?: number
}) =>
    z
        .number({
            error: message
                ? message.replace('%f', fieldName)
                : `${fieldName} must be a numeric value.`,
        })
        .min(min, `${fieldName} must be greater than or equal to ${min}.`)
        .max(max, `${fieldName} must be less than or equal to ${max}.`)
        .check((ctx) => {
            if (isNaN(Number(ctx.value))) {
                ctx.issues.push({
                    code: 'custom',
                    message: `${fieldName} is not a valid numeric value.`,
                    input: ctx.value,
                })
            }
        })
        .transform((field) => `${field}`)

export const textField = ({
    fieldName = 'Field',
    message = undefined,
    min = 1,
    max = 64,
}: {
    fieldName?: string
    message?: string
    min?: number
    max?: number
}) =>
    z
        .string({
            error: message
                ? message.replace('%f', fieldName)
                : `${fieldName} must be a string.`,
        })
        .trim()
        .min(min, `${fieldName} must be ${min} character(s) or more.`)
        .max(max, {
            error: `${fieldName} must be ${max} character(s) or less.`,
        })

/////////////////
// Refinements //
/////////////////

export const dateStringRefinement = (fieldName: string) => {
    const callbackFn: Parameters<z.ZodType<string | undefined>['check']>[0] = (
        ctx,
    ) => {
        if (ctx.value) {
            const timestamp = new Date(ctx.value).getTime()

            if (typeof timestamp !== 'number' || Number.isNaN(timestamp)) {
                ctx.issues.push({
                    code: 'custom',
                    message: `${fieldName} must be a valid date string.`,
                    input: ctx.value,
                })
            }
        }
    }

    return callbackFn
}

export const passwordRefinement = () => {
    const callbackFn: Parameters<z.ZodType<string | undefined>['check']>[0] = (
        ctx,
    ) => {
        if (ctx.value) {
            const regexp = {
                lowercase: (ctx.value.match(/[a-z]/) ?? []).length,
                uppercase: (ctx.value.match(/[A-Z]/) ?? []).length,
                numeric: (ctx.value.match(/[\d]/) ?? []).length,
                basicLatinSymbols: (
                    ctx.value.match(
                        /[\u0021-\u002f,\u003a-\u0040,\u005b-\u0060,\u007b-\u007e]/,
                    ) ?? []
                ).length,
            }

            if (Object.values(regexp).some((value) => value === 0)) {
                ctx.issues.push({
                    path: ['password'],
                    code: 'custom',
                    message:
                        'Password must be a combination of uppercase [A-Z], lowercase [a-z], numbers [0-9] & symbols [!@#...].',
                    input: ctx.value,
                })
            }
        }
    }

    return callbackFn
}

export const updatedFieldsRefinement = (
    exclusions: string[] = [],
    path: string[] = [],
) => {
    const callbackFn: Parameters<
        z.ZodType<Record<string, unknown>>['check']
    >[0] = (ctx) => {
        if (
            typeof ctx.value === 'object' &&
            Object.keys(ctx.value).length > 0
        ) {
            let hasUpdatedFields = false

            for (const key of Object.keys(ctx.value)) {
                if (exclusions.includes(key)) {
                    continue
                }

                if (ctx.value[key] !== undefined) {
                    hasUpdatedFields = true
                    break
                }
            }

            if (!hasUpdatedFields) {
                ctx.issues.push({
                    path,
                    code: 'custom',
                    message: 'Nothing to update.',
                    input: ctx.value,
                })
            }
        }
    }

    return callbackFn
}

/////////////
// Schemas //
/////////////

export const readManyBaseInputSchema = z.object({
    limit: z.coerce
        .number<number>({
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
        .number<number>({
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

export const baseOutputSchema = <Data extends z.ZodType = z.ZodType>(
    data: Data,
) =>
    z.union([
        z.object({
            data,
            count: z.number().nullish(),
            limit: z.number().nullish(),
            offset: z.number().nullish(),
        }),
        z.object({
            error: z.object({
                code: z.string(),
                message: z.string(),
            }),
            validationErrors: z.array(z.custom<z.core.$ZodIssue>()).optional(),
        }),
    ])

export const baseAddressInputSchema = z.object({
    addressLine1: textField({ fieldName: 'Address Line 1' }).uppercase(),
    addressLine2: textField({ fieldName: 'Address Line 2' })
        .uppercase()
        .optional(),
    city: textField({ fieldName: 'City' }).uppercase(),
    stateOrRegion: textField({ fieldName: 'State/Region' }).uppercase(),
    postalCode: textField({ fieldName: 'Postal Code' }).uppercase(),
    country: textField({ fieldName: 'Country' }).uppercase(),
})
