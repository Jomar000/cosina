import { z } from 'zod'

export const vBoolean = (fieldName: string) =>
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

export const vInt = ({
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
        .max(max, {
            error: `${fieldName} must be ${max} character(s) or less.`,
        })
