import { z } from 'zod'

import { baseOutputSchema, passwordRefinement, textField } from '../shared.js'

////////////////////
// passwordChange //
////////////////////

export const authPasswordChangeInputSchema = z.object({
    currentPassword: textField({
        fieldName: 'Current Password',
        min: 12,
        max: 128,
    }).check(passwordRefinement()),
    newPassword: textField({
        fieldName: 'New Password',
        min: 12,
        max: 128,
    }).check(passwordRefinement()),
})

/////////////////
// passwordSet //
/////////////////

export const authPasswordSetInputSchema = z.object({
    userId: textField({ fieldName: 'User ID' }),
    newPassword: textField({
        fieldName: 'New Password',
        min: 12,
        max: 128,
    }).check(passwordRefinement()),
})

////////////
// signIn //
////////////

export const authSignInInputSchema = z.object({
    organizationId: textField({
        fieldName: 'Organization ID',
    }),
    accountId: textField({
        fieldName: 'Account ID',
    }),
    password: textField({
        fieldName: 'Password',
        min: 12,
        max: 128,
    }).check(passwordRefinement()),
})

export const authSignInOutputSchema = baseOutputSchema(
    z.object({
        name: z.string(),
        email: z.string(),
        avatar: z.string().optional(),
        permissions: z.record(z.string(), z.array(z.string())),
        roles: z.record(z.string(), z.record(z.string(), z.array(z.string()))),
        userRoles: z.array(z.string()).min(1),
        expiresAt: z.number(),
    }),
)

////////////
// signUp //
////////////

export const authSignUpInputSchema = z.object({
    email: z
        .email({ error: 'Please provide a valid e-mail address.' })
        .toLowerCase(),
    username: textField({
        fieldName: 'Username',
        min: 6,
        max: 36,
    }).regex(/^[\w-.]+$/, {
        message:
            'Only alphanumeric, underscores, dashes & dots are allowed for username.',
    }),
    password: textField({
        fieldName: 'Password',
        min: 12,
        max: 128,
    }).check(passwordRefinement()),
    name: textField({
        fieldName: 'Name',
    }),
})
