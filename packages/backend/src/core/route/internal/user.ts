import {
    userProfileAddressUpdateInputSchema,
    userProfileUpdateInputSchema,
} from '@hyperion/validator/internal/user'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { validator } from 'hono/validator'

import { AppError } from '../../../errors.js'
import { honoValidatorCb } from '../../../utilities.js'
import { isAuthenticated } from '../../middleware/isAuthenticated.js'
import { isAuthorized } from '../../middleware/isAuthorized.js'

const internalRouteUser = new Hono<THonoInstance>()

internalRouteUser.post(
    '/user/password/override',
    isAuthorized({
        admin: ['ANY'],
    }),
    // validator('json', async (value, ctx) =>
    //     honoValidatorCb(value, ctx, objectStorageCreateDownloadLinkInputSchema),
    // ),
    async (ctx) => {
        /**
         * For Administrators
         * Override the current user's password and set a new one
         */

        // const keys = ctx.req.valid('json')
        // const { user, userProfile } = ctx.get('dbSchema')

        return ctx.json({ data: '' }, 200)
    },
)

internalRouteUser.get(
    '/user/profile/read',
    isAuthenticated(),
    // validator('json', async (value, ctx) =>
    //     honoValidatorCb(value, ctx, objectStorageCreateDownloadLinkInputSchema),
    // ),
    async (ctx) => {
        // const keys = ctx.req.valid('json')

        // const { user, userProfile } = ctx.get('dbSchema')

        return ctx.json({ data: '' }, 200)
    },
)

internalRouteUser.get(
    '/user/profile/readMany',
    isAuthorized({
        admin: ['ANY'],
    }),
    // validator('json', async (value, ctx) =>
    //     honoValidatorCb(value, ctx, objectStorageCreateDownloadLinkInputSchema),
    // ),
    async (ctx) => {
        // const keys = ctx.req.valid('json')

        // const { user, userProfile } = ctx.get('dbSchema')

        return ctx.json({ data: '' }, 200)
    },
)

internalRouteUser.post(
    '/user/profile/update',
    isAuthenticated(),
    validator('json', async (value, ctx) =>
        honoValidatorCb(value, ctx, userProfileUpdateInputSchema),
    ),
    async (ctx) => {
        const {
            userId,
            firstName,
            middleName,
            lastName,
            nameExtension,
            gender,
            backupPhoneNumber,
        } = ctx.req.valid('json')

        const { userProfile } = ctx.get('dbSchema')

        try {
            if (
                !ctx.get('isPrivilegedRole') &&
                ctx.get('user')!.id !== userId
            ) {
                return ctx.json(
                    {
                        error: {
                            code: 'FORBIDDEN',
                            message:
                                'You are not allowed to access this resource.',
                        },
                    },
                    403,
                )
            }

            const data = await ctx
                .get('dbClient')
                .update(userProfile)
                .set({
                    firstName,
                    middleName,
                    lastName,
                    nameExtension,
                    gender,
                    backupPhoneNumber,
                })
                .where(eq(userProfile.userId, userId))
                .returning({
                    firstName: userProfile.firstName,
                    middleName: userProfile.middleName,
                    lastName: userProfile.lastName,
                    nameExtension: userProfile.nameExtension,
                    gender: userProfile.gender,
                    backupPhoneNumber: userProfile.backupPhoneNumber,
                    updatedAt: userProfile.updatedAt,
                })

            return ctx.json({ data }, 200)
        } catch (err) {
            throw new AppError(
                {
                    status: 500,
                    code: 'ADDRESS_UPDATE_FAILED',
                    message: 'Address update failed.',
                },
                err instanceof Error ? err : undefined,
            )
        }
    },
)

internalRouteUser.post(
    '/user/profile/update/address',
    isAuthenticated(),
    validator('json', async (value, ctx) =>
        honoValidatorCb(value, ctx, userProfileAddressUpdateInputSchema),
    ),
    async (ctx) => {
        const {
            userId,
            addressLine1,
            addressLine2,
            city,
            stateOrRegion,
            postalCode,
            country,
        } = ctx.req.valid('json')

        const { address, userProfile } = ctx.get('dbSchema')

        try {
            if (
                !ctx.get('isPrivilegedRole') &&
                ctx.get('user')!.id !== userId
            ) {
                return ctx.json(
                    {
                        error: {
                            code: 'FORBIDDEN',
                            message:
                                'You are not allowed to access this resource.',
                        },
                    },
                    403,
                )
            }

            const data = await ctx.get('dbClient').transaction(async (tx) => {
                const hashSha256 = bytesToHex(
                    sha256(
                        new TextEncoder().encode(
                            [
                                addressLine1,
                                addressLine2,
                                city,
                                stateOrRegion,
                                postalCode,
                                country,
                            ].join('|'),
                        ),
                    ),
                )

                const newAddressId = await tx
                    .insert(address)
                    .values({
                        addressLine1,
                        addressLine2,
                        city,
                        stateOrRegion,
                        postalCode,
                        country,
                        hashSha256,
                    })
                    .onConflictDoNothing()
                    .returning({ id: address.id })

                await tx
                    .update(userProfile)
                    .set({
                        addressId: newAddressId[0].id,
                    })
                    .where(eq(userProfile.userId, userId))

                return {
                    addressLine1,
                    addressLine2,
                    city,
                    stateOrRegion,
                    postalCode,
                    country,
                }
            })

            return ctx.json({ data }, 200)
        } catch (err) {
            throw new AppError(
                {
                    status: 500,
                    code: 'ADDRESS_UPDATE_FAILED',
                    message: 'Address update failed.',
                },
                err instanceof Error ? err : undefined,
            )
        }
    },
)

export default internalRouteUser
