import { profile } from '@hyperion/contracts/validator/app/user'
import { and, eq, getTableColumns } from 'drizzle-orm'
import { Hono } from 'hono'
import { validator } from 'hono/validator'

import { AppError } from '../../../../errors.js'
import {
    apiResponseOkWrapper,
    validatorCallback,
} from '../../../../utilities.js'

export const profileRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .get('/read', async (ctx) => {
        const { member, userProfile } = ctx.get('dbSchema')

        try {
            const searchCondition = and(
                eq(
                    member.organizationId,
                    ctx.get('session')!.activeOrganizationId!,
                ),
                eq(userProfile.userId, ctx.get('user')!.id),
            )

            const { createdAt, updatedAt, ...selectedColumns } =
                getTableColumns(userProfile)

            const data = await ctx
                .get('dbClient')
                .select(selectedColumns)
                .from(userProfile)
                .innerJoin(member, eq(member.userId, userProfile.userId))
                .where(searchCondition)

            return apiResponseOkWrapper(ctx, { data })
        } catch (err) {
            throw new AppError(
                {
                    status: 500,
                    code: 'PROFILE_RETRIEVAL_FAILED',
                    message: 'Profile retrieval failed.',
                },
                err instanceof Error ? err : undefined,
            )
        }
    })
    .post(
        '/update',
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, profile.updateInputSchema),
        ),
        async (ctx) => {
            const {
                firstName,
                middleName,
                lastName,
                nameExtension,
                gender,
                backupPhoneNumber,
            } = ctx.req.valid('json')

            const { member, userProfile } = ctx.get('dbSchema')

            try {
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
                    .from(member)
                    .where(eq(userProfile.userId, ctx.get('user')!.id))
                    .returning({
                        firstName: userProfile.firstName,
                        middleName: userProfile.middleName,
                        lastName: userProfile.lastName,
                        nameExtension: userProfile.nameExtension,
                        gender: userProfile.gender,
                        backupPhoneNumber: userProfile.backupPhoneNumber,
                        updatedAt: userProfile.updatedAt,
                    })

                return apiResponseOkWrapper(ctx, { data })
            } catch (err) {
                throw new AppError(
                    {
                        status: 500,
                        code: 'PROFILE_UPDATE_FAILED',
                        message: 'Profile update failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .post(
        '/update/address',
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, profile.updateAddressInputSchema),
        ),
        async (ctx) => {
            const {
                line1,
                line2,
                cityMunicipality,
                provinceStateRegion,
                postalCode,
                countryCode,
            } = ctx.req.valid('json')

            const { address, userProfile } = ctx.get('dbSchema')

            try {
                const data = await ctx
                    .get('dbClient')
                    .transaction(async (tx) => {
                        const existingAddressId = (
                            await tx
                                .select({ addressId: userProfile.addressId })
                                .from(userProfile)
                                .where(
                                    eq(userProfile.userId, ctx.get('user')!.id),
                                )
                        )[0]

                        if (existingAddressId?.addressId) {
                            await tx
                                .update(address)
                                .set({
                                    line1,
                                    line2,
                                    cityMunicipality,
                                    provinceStateRegion,
                                    postalCode,
                                    countryCode,
                                })
                                .where(
                                    eq(address.id, existingAddressId.addressId),
                                )
                        } else {
                            const newAddressId = await tx
                                .insert(address)
                                .values({
                                    line1,
                                    line2,
                                    cityMunicipality,
                                    provinceStateRegion,
                                    postalCode,
                                    countryCode,
                                })
                                .returning({ id: address.id })

                            await tx
                                .update(userProfile)
                                .set({
                                    addressId: newAddressId[0].id,
                                })
                                .where(
                                    eq(userProfile.userId, ctx.get('user')!.id),
                                )
                        }

                        return {
                            line1,
                            line2,
                            cityMunicipality,
                            provinceStateRegion,
                            postalCode,
                            countryCode,
                        }
                    })

                return apiResponseOkWrapper(ctx, { data })
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

export default profileRoute
