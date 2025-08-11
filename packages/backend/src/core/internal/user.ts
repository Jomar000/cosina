import {
    authPasswordChangeInputSchema,
    authPasswordSetInputSchema,
    authSignInInputSchema,
    authSignUpInputSchema,
} from '@hyperion/validator/internal/auth'
import type { APIError } from 'better-auth'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'

import { cfTurnstileVerifier } from '../../utilities.js'
import { isAuthenticated } from '../middleware/isAuthenticated.js'
import { isAuthorized } from '../middleware/isAuthorized.js'

const internalRouteUser = new Hono<THonoInstance>()

// internalRouteUser.post('/password/change', isAuthenticated(), async (ctx) => {
//     const validator = await authPasswordChangeInputSchema.safeParseAsync(
//         await ctx.req.json(),
//     )

//     if (!validator.data) {
//         return ctx.json(
//             {
//                 success: false,
//                 message: 'An error occurred while validating input data.',
//                 validationErrors: validator.error.issues,
//             },
//             400,
//         )
//     }

//     const { currentPassword, newPassword } = validator.data

//     try {
//         await ctx.get('auth').api.changePassword({
//             headers: new Headers({
//                 authorization: ctx.req.header('authorization') || '',
//             }),
//             body: {
//                 newPassword,
//                 currentPassword,
//                 revokeOtherSessions: true,
//             },
//         })

//         return ctx.json(
//             {
//                 success: true,
//                 data: null,
//             },
//             200,
//         )
//     } catch (err) {
//         return ctx.json(
//             { success: false, message: 'Failed to set new password.' },
//             422,
//         )
//     }
// })

// internalRouteUser.post('/password/set', isAuthorized(3), async (ctx) => {
//     const validator = await authPasswordSetInputSchema.safeParseAsync(
//         await ctx.req.json(),
//     )

//     if (!validator.data) {
//         return ctx.json(
//             {
//                 success: false,
//                 message: 'An error occurred while validating input data.',
//                 validationErrors: validator.error.issues,
//             },
//             400,
//         )
//     }

//     const { userId, newPassword } = validator.data
//     const { account } = ctx.get('dbSchema')

//     const authContext = await ctx.get('auth').$context

//     const updatedData = (
//         await ctx
//             .get('dbClient')
//             .update(account)
//             .set({
//                 password: await authContext.password.hash(newPassword),
//             })
//             .where(
//                 and(
//                     eq(account.userId, userId),
//                     eq(account.providerId, 'credential'),
//                 ),
//             )
//             .returning()
//     )[0]

//     if (!updatedData) {
//         return ctx.json(
//             { success: false, message: 'Failed to set new password.' },
//             422,
//         )
//     }

//     return ctx.json(
//         {
//             success: true,
//             data: {
//                 id: updatedData.id,
//                 updatedAt: updatedData.updatedAt,
//             },
//         },
//         200,
//     )
// })

// internalRouteUser.post('/signOut', isAuthenticated(), async (ctx) => {
//     await ctx.get('auth').api.signOut({
//         headers: new Headers({
//             authorization: ctx.req.header('authorization') || '',
//         }),
//     })

//     return ctx.json(
//         {
//             success: true,
//             message: 'You have successfully signed-out from the system.',
//         },
//         200,
//     )
// })

// internalRouteUser.post('/signUp', async (ctx) => {
//     const validator = await authSignUpInputSchema
//         .check(async (rctx) => {
//             const isCfTurnstileVerified = await cfTurnstileVerifier(
//                 ctx,
//                 rctx.value.captchaToken,
//             )

//             if (!isCfTurnstileVerified) {
//                 rctx.issues.push({
//                     path: ['captchaToken'],
//                     code: 'custom',
//                     message: 'CAPTCHA verification failed.',
//                     input: '<REDACTED>',
//                 })
//             }
//         })
//         .safeParseAsync(await ctx.req.json())

//     if (!validator.data) {
//         return ctx.json(
//             {
//                 success: false,
//                 message: 'An error occurred while validating input data.',
//                 validationErrors: validator.error.issues,
//             },
//             400,
//         )
//     }

//     const { email, username, password, name } = validator.data

//     try {
//         const data = await ctx.get('auth').api.signUpEmail({
//             body: {
//                 email,
//                 username,
//                 password,
//                 name,
//             },
//         })

//         return ctx.json(
//             {
//                 success: true,
//                 data: {
//                     id: data.user.id,
//                     createdAt: data.user.createdAt,
//                 },
//             },
//             200,
//         )
//     } catch (err) {
//         switch ((err as APIError).body?.code) {
//             case 'USER_ALREADY_EXISTS': {
//                 return ctx.json(
//                     {
//                         success: false,
//                         message:
//                             'E-mail address already taken, please try another.',
//                     },
//                     422,
//                 )
//             }
//             case 'USERNAME_IS_ALREADY_TAKEN_PLEASE_TRY_ANOTHER': {
//                 return ctx.json(
//                     {
//                         success: false,
//                         message: 'Username already taken, please try another.',
//                     },
//                     422,
//                 )
//             }
//         }

//         throw err
//     }
// })

export default internalRouteUser
