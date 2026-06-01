import { zValidator } from '@hono/zod-validator'
import type { Context, ValidationTargets } from 'hono'
import type { ZodType } from 'zod'

import type { THonoInstance } from '../../types.js'
import { apiResponseErrorWrapper } from '../../utilities/helpers.js'

/**
 * Request Validator Middleware
 *
 * @description
 * Create a Zod request validator with the app's standard validation error response.
 */
export const validateRequest = <
    TTarget extends keyof ValidationTargets,
    TSchema extends ZodType,
>(
    target: TTarget,
    schema: TSchema,
) => {
    return zValidator(target, schema, (result, ctx) => {
        if (result.success) return

        return apiResponseErrorWrapper(ctx as Context<THonoInstance>, {
            code: 'DATA_VALIDATION',
            message: 'An error occurred while validating input data.',
            validatorIssues: result.error.issues,
        })
    })
}
