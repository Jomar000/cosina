import { profile } from '@hyperion/validator/public/admin/user'
import { and, asc, count as countFn, desc, eq } from 'drizzle-orm'
import { getColumns } from 'drizzle-orm/utils'
import { Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import { AppError } from '../../../../../errors.js'
import type {
    TGlobalApiResponses,
    THonoInstance,
} from '../../../../../types.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
    auditTrailLogger,
} from '../../../../../utilities/helpers.js'
import { validateRequest } from '../../../../middleware/validateRequest.js'

export const profileRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .get(
        '/read',
        validateRequest('query', profile.readInputSchema),
        async (ctx) => {
            const { userId } = ctx.req.valid('query')

            const { member, userProfile } = ctx.get('dbSchema')

            try {
                const searchCondition = and(
                    eq(
                        member.organizationId,
                        ctx.get('session')!.activeOrganizationId!,
                    ),
                    eq(userProfile.userId, userId),
                )

                const { createdAt, updatedAt, ...selectedColumns } =
                    getColumns(userProfile)

                const data = await ctx
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
        },
    )
    .get(
        '/readMany',
        validateRequest('query', profile.readManyInputSchema),
        async (ctx) => {
            const { limit, offset, sortOrder } = ctx.req.valid('query')

            const { member, userProfile } = ctx.get('dbSchema')

            try {
                const searchCondition = eq(
                    member.organizationId,
                    ctx.get('session')!.activeOrganizationId!,
                )

                const count = (
                    await ctx
                        .get('dbClient')
                        .select({ count: countFn(userProfile.userId) })
                        .from(userProfile)
                        .innerJoin(
                            member,
                            eq(member.userId, userProfile.userId),
                        )
                        .where(searchCondition)
                )[0].count

                const { createdAt, updatedAt, ...selectedColumns } =
                    getColumns(userProfile)

                const subquery = ctx
                    .get('dbClient')
                    .select({ userId: userProfile.userId })
                    .from(userProfile)
                    .innerJoin(member, eq(member.userId, userProfile.userId))
                    .where(searchCondition)
                    .limit(limit)
                    .offset(offset)
                    .orderBy(
                        sortOrder === 'asc'
                            ? asc(userProfile.userId)
                            : desc(userProfile.userId),
                    )
                    .as('subquery')

                const data = await ctx
                    .get('dbClient')
                    .select(selectedColumns)
                    .from(userProfile)
                    .innerJoin(
                        subquery,
                        eq(subquery.userId, userProfile.userId),
                    )
                    .orderBy(
                        sortOrder === 'asc'
                            ? asc(userProfile.userId)
                            : desc(userProfile.userId),
                    )

                return apiResponseOkWrapper(ctx, { data, count, limit, offset })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'PROFILE_LIST_RETRIEVAL_FAILED',
                        message: 'Profile list retrieval failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .post(
        '/update',
        validateRequest('json', profile.updateInputSchema),
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

            const { member, userProfile } = ctx.get('dbSchema')

            const searchCondition = and(
                eq(
                    member.organizationId,
                    ctx.get('session')!.activeOrganizationId!,
                ),
                eq(userProfile.userId, userId),
            )

            const count = (
                await ctx
                    .get('dbClient')
                    .select({ count: countFn(userProfile.userId) })
                    .from(userProfile)
                    .innerJoin(member, eq(member.userId, userProfile.userId))
                    .where(searchCondition)
            )[0].count

            if (count === 0) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'User ID not found, nothing to update.',
                    status: 404,
                })
            }

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
                            .where(eq(userProfile.userId, userId))

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
                            .from(member)
                            .where(eq(userProfile.userId, userId))
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
                                component: 'admin.user.profile',
                                action: 'update',
                                description: 'Admin updated user profile',
                                records: {
                                    table: 'user_profile',
                                    id: userId,
                                    oldData,
                                },
                            },
                            tx,
                        )

                        return updated
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
                userId,
                line1,
                line2,
                cityMunicipality,
                provinceStateRegion,
                postalCode,
                countryCode,
            } = ctx.req.valid('json')

            const { address, member, userProfile } = ctx.get('dbSchema')

            const searchCondition = and(
                eq(
                    member.organizationId,
                    ctx.get('session')!.activeOrganizationId!,
                ),
                eq(userProfile.userId, userId),
            )

            const count = (
                await ctx
                    .get('dbClient')
                    .select({ count: countFn(userProfile.userId) })
                    .from(userProfile)
                    .innerJoin(member, eq(member.userId, userProfile.userId))
                    .where(searchCondition)
            )[0].count

            if (count === 0) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'User ID not found, nothing to update.',
                    status: 404,
                })
            }

            try {
                const data = await ctx
                    .get('dbClient')
                    .transaction(async (tx) => {
                        const existingAddressId = (
                            await tx
                                .select({ addressId: userProfile.addressId })
                                .from(userProfile)
                                .where(eq(userProfile.userId, userId))
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
                                .where(eq(userProfile.userId, userId))
                        }

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'admin.user.profile',
                                action: 'update.address',
                                description: 'Admin updated user address',
                                records: [
                                    { table: 'user_profile', id: userId },
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

export type AdminUserProfileRouteType = ApplyGlobalResponse<
    typeof profileRoute,
    TGlobalApiResponses
>

export default profileRoute
