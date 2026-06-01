import { z } from 'zod'

export const INT4_MIN = -2147483648
export const INT4_MAX = 2147483647

export const vBoolean = (fieldName: string) =>
    z
        .union([
            z.boolean(),
            z
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
                ),
        ])
        .transform((field) =>
            typeof field === 'boolean' ? field : field === 'true',
        )

export const vInt = ({
    fieldName = 'Field',
    message = undefined,
    min = INT4_MIN,
    max = INT4_MAX,
}: {
    fieldName?: string
    message?: string
    min?: number
    max?: number
}) =>
    z
        .union(
            [
                z.string(),
                z.number(),
            ],
            {
                error: message
                    ? message.replace('%f', fieldName)
                    : `${fieldName} must be an integer.`,
            },
        )
        .transform((field) => Number(field))
        .pipe(
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
                .min(
                    min,
                    `${fieldName} must be greater than or equal to ${min}.`,
                )
                .max(max, `${fieldName} must be less than or equal to ${max}.`),
        )

export const vNumeric = ({
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
        .union(
            [
                z.string(),
                z.number(),
            ],
            {
                error: message
                    ? message.replace('%f', fieldName)
                    : `${fieldName} must be a string or a number.`,
            },
        )
        .transform((field) => Number(field))
        .pipe(
            z
                .number({
                    error: message
                        ? message.replace('%f', fieldName)
                        : `${fieldName} must be a valid numeric string or numeric value.`,
                })
                .min(
                    min,
                    `${fieldName} must be greater than or equal to ${min}.`,
                )
                .max(max, `${fieldName} must be less than or equal to ${max}.`),
        )
        .transform((field) => `${field}`)

export const vText = ({
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
        .max(max, `${fieldName} must be ${max} character(s) or less.`)
