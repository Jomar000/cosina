import { z } from 'zod'

export const dateString = (fieldName: string) => {
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

export const password = () => {
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

export const updatedFields = (
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
