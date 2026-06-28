import { profile } from '@cosina/validator/backoffice/user'
import { and, eq } from 'drizzle-orm'
import { getColumns } from 'drizzle-orm/utils'
import { Hono } from 'hono'

import { AppError } from '../../../../errors.js'
import type { THonoInstance } from '../../../../types.js'
import {
    apiResponseOkWrapper,
    auditTrailLogger,
} from '../../../../utilities/helpers.js'
import { validateRequest } from '../../../middleware/validateRequest.js'

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
                getColumns(userProfile)

            const [data] = await ctx
                .get('dbClient')
                .select(selectedColumns)
                .from(userProfile)
                .innerJoin(member, eq(member.userId, userProfile.userId))
                .where(searchCondition)

            return apiResponseOkWrapper(ctx, { data })
        } catch (err) {
            if (err instanceof AppError) throw err

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
        validateRequest('json', profile.updateInputSchema),
        async (ctx) => {
            const {
                firstName,
                middleName,
                lastName,
                nameExtension,
                gender,
                backupPhoneNumber,
            } = ctx.req.valid('json')

            const { userProfile } = ctx.get('dbSchema')

            try {
                const data = await ctx
                    .get('dbClient')
                    .transaction(async (tx) => {
                        const [oldData] = await tx
                            .select({
                                firstName: userProfile.firstName,
                                middleName: userProfile.middleName,
                                lastName: userProfile.lastName,
                                nameExtension: userProfile.nameExtension,
                                gender: userProfile.gender,
                                backupPhoneNumber:
                                    userProfile.backupPhoneNumber,
                            })
                            .from(userProfile)
                            .where(eq(userProfile.userId, ctx.get('user')!.id))

                        const updated = await tx
                            .update(userProfile)
                            .set({
                                firstName,
                                middleName,
                                lastName,
                                nameExtension,
                                gender,
                                backupPhoneNumber,
                            })
                            .where(eq(userProfile.userId, ctx.get('user')!.id))
                            .returning({
                                firstName: userProfile.firstName,
                                middleName: userProfile.middleName,
                                lastName: userProfile.lastName,
                                nameExtension: userProfile.nameExtension,
                                gender: userProfile.gender,
                                backupPhoneNumber:
                                    userProfile.backupPhoneNumber,
                                updatedAt: userProfile.updatedAt,
                            })

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'user.profile',
                                action: 'update',
                                description: 'User updated their profile',
                                records: {
                                    table: 'user_profile',
                                    id: ctx.get('user')!.id,
                                    oldData,
                                },
                            },
                            tx,
                        )

                        return updated[0]
                    })

                return apiResponseOkWrapper(ctx, { data })
            } catch (err) {
                if (err instanceof AppError) throw err

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
        validateRequest('json', profile.updateAddressInputSchema),
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

                        const oldAddressData = existingAddressId?.addressId
                            ? (
                                  await tx
                                      .select({
                                          line1: address.line1,
                                          line2: address.line2,
                                          cityMunicipality:
                                              address.cityMunicipality,
                                          provinceStateRegion:
                                              address.provinceStateRegion,
                                          postalCode: address.postalCode,
                                          countryCode: address.countryCode,
                                      })
                                      .from(address)
                                      .where(
                                          eq(
                                              address.id,
                                              existingAddressId.addressId,
                                          ),
                                      )
                              )[0]
                            : undefined

                        let resolvedAddressId: number

                        if (existingAddressId?.addressId) {
                            resolvedAddressId = existingAddressId.addressId
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
                            const [{ id }] = await tx
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

                            resolvedAddressId = id

                            await tx
                                .update(userProfile)
                                .set({ addressId: id })
                                .where(
                                    eq(userProfile.userId, ctx.get('user')!.id),
                                )
                        }

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'user.profile',
                                action: 'update.address',
                                description: 'User updated their address',
                                records: [
                                    {
                                        table: 'user_profile',
                                        id: ctx.get('user')!.id,
                                        oldData: {
                                            addressId:
                                                existingAddressId?.addressId ??
                                                null,
                                        },
                                    },
                                    {
                                        table: 'address',
                                        id: String(resolvedAddressId),
                                        oldData: oldAddressData,
                                    },
                                ],
                            },
                            tx,
                        )

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
                if (err instanceof AppError) throw err

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
