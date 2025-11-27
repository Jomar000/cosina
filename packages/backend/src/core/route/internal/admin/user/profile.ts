import { user } from '@hyperion/validator/internal/admin'
import {
    and,
    asc,
    count as countFn,
    desc,
    eq,
    getTableColumns,
} from 'drizzle-orm'
import { Hono } from 'hono'
import { validator } from 'hono/validator'

import { AppError } from '../../../../../errors.js'
import { honoValidatorCb } from '../../../../../utilities.js'

export const profileRoute = new Hono<THonoInstance>()

// Routes
profileRoute.get(
    '/read',
    validator('query', async (value, ctx) =>
        honoValidatorCb(value, ctx, user.profile.readInputSchema),
    ),
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
                getTableColumns(userProfile)

            const data = await ctx
                .get('dbClient')
                .select(selectedColumns)
                .from(userProfile)
                .innerJoin(member, eq(member.userId, userProfile.userId))
                .where(searchCondition)

            return ctx.json({ data }, 200)
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
    },
)

profileRoute.get(
    '/readMany',
    validator('query', async (value, ctx) =>
        honoValidatorCb(value, ctx, user.profile.readManyInputSchema),
    ),
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
                    .innerJoin(member, eq(member.userId, userProfile.userId))
                    .where(searchCondition)
            )[0].count

            const { createdAt, updatedAt, ...selectedColumns } =
                getTableColumns(userProfile)

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
                .innerJoin(subquery, eq(subquery.userId, userProfile.userId))
                .orderBy(
                    sortOrder === 'asc'
                        ? asc(userProfile.userId)
                        : desc(userProfile.userId),
                )

            return ctx.json({ limit, offset, count, data }, 200)
        } catch (err) {
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

profileRoute.post(
    '/update',
    validator('json', async (value, ctx) =>
        honoValidatorCb(value, ctx, user.profile.updateInputSchema),
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
            return ctx.json(
                {
                    error: {
                        code: 'BAD_REQUEST',
                        message: 'User ID not found, nothing to update.',
                    },
                },
                400,
            )
        }

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
                    code: 'PROFILE_UPDATE_FAILED',
                    message: 'Profile update failed.',
                },
                err instanceof Error ? err : undefined,
            )
        }
    },
)

profileRoute.post(
    '/update/address',
    validator('json', async (value, ctx) =>
        honoValidatorCb(value, ctx, user.profile.addressUpdateInputSchema),
    ),
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
            return ctx.json(
                {
                    error: {
                        code: 'BAD_REQUEST',
                        message: 'User ID not found, nothing to update.',
                    },
                },
                400,
            )
        }

        try {
            const data = await ctx.get('dbClient').transaction(async (tx) => {
                const existingAddressId = (
                    await tx
                        .select({ addressId: userProfile.addressId })
                        .from(userProfile)
                        .where(eq(userProfile.userId, userId))
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
                        .where(eq(address.id, existingAddressId.addressId))
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
                        .where(eq(userProfile.userId, userId))
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

export default profileRoute
