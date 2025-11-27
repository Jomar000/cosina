import { z } from 'zod'

import { base, field, refinement } from '../shared/index.js'

export const signInInputSchema = z.object({
    organizationId: field.vText({
        fieldName: 'Organization ID',
    }),
    accountId: field.vText({
        fieldName: 'Account ID',
    }),
    password: field
        .vText({
            fieldName: 'Password',
            min: 12,
            max: 128,
        })
        .check(refinement.password()),
})

export const signInOutputSchema = base.outputSchema(
    z.object({
        name: z.string(),
        email: z.string(),
        avatar: z.string().optional().default(''),
        permissions: z.record(z.string(), z.array(z.string())),
        roles: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
        userRoles: z.array(z.string()).min(1),
        expiresAt: z.number(),
    }),
)

export const signUpInputSchema = z.object({
    email: z
        .email({ error: 'Please provide a valid e-mail address.' })
        .toLowerCase(),
    username: field
        .vText({
            fieldName: 'Username',
            min: 6,
            max: 36,
        })
        .regex(/^[\w-.]+$/, {
            message:
                'Only alphanumeric, underscores, dashes & dots are allowed for username.',
        }),
    password: field
        .vText({
            fieldName: 'Password',
            min: 12,
            max: 128,
        })
        .check(refinement.password()),
    name: field.vText({
        fieldName: 'Name',
    }),
})
