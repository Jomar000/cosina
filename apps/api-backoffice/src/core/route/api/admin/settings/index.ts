import { settings } from '@cosina/validator/backoffice/admin/settings'
import { eq, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import { AppError } from '../../../../../errors.js'
import type {
    TGlobalApiResponses,
    THonoInstance,
} from '../../../../../types.js'
import {
    apiResponseOkWrapper,
    auditTrailLogger,
} from '../../../../../utilities/helpers.js'
import { validateRequest } from '../../../../middleware/validateRequest.js'

const ADVANCE_DAYS_KEY = 'order:settings:advanceDays'
const DEFAULT_ADVANCE_DAYS = 3
const RESTAURANT_ADDRESS_KEY = 'order:settings:restaurantAddress'
const CLOSING_DAYS_KEY = 'order:settings:closingDays'
const GCASH_ACCOUNT_NAME_KEY = 'order:settings:gcashAccountName'
const GCASH_NUMBER_KEY = 'order:settings:gcashNumber'
const PAYMENT_INSTRUCTIONS_KEY = 'order:settings:paymentInstructions'

async function broadcastSettingsEvent(
    env: THonoInstance['Bindings'],
    data: unknown,
) {
    try {
        const id = env.COSINAPUB_DO_WSS.idFromName('settings')
        const stub = env.COSINAPUB_DO_WSS.get(id)
        await stub.sendMessage(
            JSON.stringify({ event: 'settings.update', data }),
        )
    } catch (err) {
        // Non-fatal: WS broadcast failure should not abort the HTTP response
        console.error(
            '[broadcastSettingsEvent] Failed to broadcast settings update',
            err,
        )
    }
}

function parseClosingDays(
    raw: string | null | undefined,
): settings.TClosingDayItem[] {
    if (!raw) return []
    try {
        const parsed = JSON.parse(raw)
        const result = settings.closingDaysArraySchema.safeParse(parsed)
        return result.success ? result.data : []
    } catch {
        return []
    }
}

export const settingsRoute = new Hono<THonoInstance>()
    .get('/read', async (ctx) => {
        const { keyValue } = ctx.get('dbSchema')

        try {
            const rows = await ctx
                .get('dbClient')
                .select({ key: keyValue.key, value: keyValue.value })
                .from(keyValue)
                .where(
                    inArray(keyValue.key, [
                        ADVANCE_DAYS_KEY,
                        RESTAURANT_ADDRESS_KEY,
                        CLOSING_DAYS_KEY,
                        GCASH_ACCOUNT_NAME_KEY,
                        GCASH_NUMBER_KEY,
                        PAYMENT_INSTRUCTIONS_KEY,
                    ]),
                )

            const byKey = Object.fromEntries(
                rows.map((r) => [
                    r.key,
                    r.value,
                ]),
            )

            const advanceDays = byKey[ADVANCE_DAYS_KEY]
                ? parseInt(byKey[ADVANCE_DAYS_KEY]!, 10)
                : DEFAULT_ADVANCE_DAYS

            const restaurantAddress = byKey[RESTAURANT_ADDRESS_KEY] ?? null
            const closingDays = parseClosingDays(byKey[CLOSING_DAYS_KEY])
            const gcashAccountName = byKey[GCASH_ACCOUNT_NAME_KEY] ?? null
            const gcashNumber = byKey[GCASH_NUMBER_KEY] ?? null
            const paymentInstructions = byKey[PAYMENT_INSTRUCTIONS_KEY] ?? null

            return apiResponseOkWrapper(ctx, {
                data: {
                    advanceDays,
                    restaurantAddress,
                    closingDays,
                    gcashAccountName,
                    gcashNumber,
                    paymentInstructions,
                },
            })
        } catch (err) {
            if (err instanceof AppError) throw err

            throw new AppError(
                {
                    status: 500,
                    code: 'SETTINGS_READ_FAILED',
                    message: 'Failed to read order settings.',
                },
                err instanceof Error ? err : undefined,
            )
        }
    })
    .post(
        '/update',
        validateRequest('json', settings.updateSettingsInputSchema),
        async (ctx) => {
            const {
                advanceDays,
                restaurantAddress,
                gcashAccountName,
                gcashNumber,
                paymentInstructions,
            } = ctx.req.valid('json')

            const { keyValue } = ctx.get('dbSchema')

            try {
                await ctx
                    .get('dbClient')
                    .insert(keyValue)
                    .values({
                        key: ADVANCE_DAYS_KEY,
                        value: String(advanceDays),
                    })
                    .onConflictDoUpdate({
                        target: keyValue.key,
                        set: {
                            value: String(advanceDays),
                            updatedAt: sql`now()`,
                        },
                    })

                if (restaurantAddress !== undefined) {
                    await ctx
                        .get('dbClient')
                        .insert(keyValue)
                        .values({
                            key: RESTAURANT_ADDRESS_KEY,
                            value: restaurantAddress,
                        })
                        .onConflictDoUpdate({
                            target: keyValue.key,
                            set: {
                                value: restaurantAddress,
                                updatedAt: sql`now()`,
                            },
                        })
                }

                if (gcashAccountName !== undefined) {
                    await ctx
                        .get('dbClient')
                        .insert(keyValue)
                        .values({
                            key: GCASH_ACCOUNT_NAME_KEY,
                            value: gcashAccountName,
                        })
                        .onConflictDoUpdate({
                            target: keyValue.key,
                            set: {
                                value: gcashAccountName,
                                updatedAt: sql`now()`,
                            },
                        })
                }

                if (gcashNumber !== undefined) {
                    await ctx
                        .get('dbClient')
                        .insert(keyValue)
                        .values({
                            key: GCASH_NUMBER_KEY,
                            value: gcashNumber,
                        })
                        .onConflictDoUpdate({
                            target: keyValue.key,
                            set: {
                                value: gcashNumber,
                                updatedAt: sql`now()`,
                            },
                        })
                }

                if (paymentInstructions !== undefined) {
                    await ctx
                        .get('dbClient')
                        .insert(keyValue)
                        .values({
                            key: PAYMENT_INSTRUCTIONS_KEY,
                            value: paymentInstructions,
                        })
                        .onConflictDoUpdate({
                            target: keyValue.key,
                            set: {
                                value: paymentInstructions,
                                updatedAt: sql`now()`,
                            },
                        })
                }

                await auditTrailLogger(ctx, {
                    component: 'admin.settings',
                    action: 'update',
                    description: `Admin updated order settings`,
                    records: {
                        table: 'key_value',
                        id: ADVANCE_DAYS_KEY,
                    },
                })

                const resolvedAddress =
                    restaurantAddress !== undefined
                        ? restaurantAddress
                        : ((
                              await ctx
                                  .get('dbClient')
                                  .select({ value: keyValue.value })
                                  .from(keyValue)
                                  .where(
                                      eq(keyValue.key, RESTAURANT_ADDRESS_KEY),
                                  )
                                  .limit(1)
                          )[0]?.value ?? null)

                // Read current closingDays to include in broadcast
                const closingDaysRows = await ctx
                    .get('dbClient')
                    .select({ value: keyValue.value })
                    .from(keyValue)
                    .where(eq(keyValue.key, CLOSING_DAYS_KEY))
                    .limit(1)

                const closingDays = parseClosingDays(
                    closingDaysRows[0]?.value ?? undefined,
                )

                // Resolve payment fields for broadcast
                const resolvedGcashAccountName =
                    gcashAccountName !== undefined
                        ? gcashAccountName
                        : ((
                              await ctx
                                  .get('dbClient')
                                  .select({ value: keyValue.value })
                                  .from(keyValue)
                                  .where(
                                      eq(keyValue.key, GCASH_ACCOUNT_NAME_KEY),
                                  )
                                  .limit(1)
                          )[0]?.value ?? null)

                const resolvedGcashNumber =
                    gcashNumber !== undefined
                        ? gcashNumber
                        : ((
                              await ctx
                                  .get('dbClient')
                                  .select({ value: keyValue.value })
                                  .from(keyValue)
                                  .where(eq(keyValue.key, GCASH_NUMBER_KEY))
                                  .limit(1)
                          )[0]?.value ?? null)

                const resolvedPaymentInstructions =
                    paymentInstructions !== undefined
                        ? paymentInstructions
                        : ((
                              await ctx
                                  .get('dbClient')
                                  .select({ value: keyValue.value })
                                  .from(keyValue)
                                  .where(
                                      eq(
                                          keyValue.key,
                                          PAYMENT_INSTRUCTIONS_KEY,
                                      ),
                                  )
                                  .limit(1)
                          )[0]?.value ?? null)

                await broadcastSettingsEvent(ctx.env, {
                    advanceDays,
                    restaurantAddress: resolvedAddress,
                    closingDays,
                    gcashAccountName: resolvedGcashAccountName,
                    gcashNumber: resolvedGcashNumber,
                    paymentInstructions: resolvedPaymentInstructions,
                })

                return apiResponseOkWrapper(ctx, {
                    data: {
                        advanceDays,
                        restaurantAddress: resolvedAddress,
                        closingDays,
                        gcashAccountName: resolvedGcashAccountName,
                        gcashNumber: resolvedGcashNumber,
                        paymentInstructions: resolvedPaymentInstructions,
                    },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'SETTINGS_UPDATE_FAILED',
                        message: 'Failed to update order settings.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .post(
        '/closingDays/update',
        validateRequest('json', settings.updateClosingDaysInputSchema),
        async (ctx) => {
            const { closingDays } = ctx.req.valid('json')

            const { keyValue } = ctx.get('dbSchema')

            try {
                const serialized = JSON.stringify(closingDays)

                await ctx
                    .get('dbClient')
                    .insert(keyValue)
                    .values({ key: CLOSING_DAYS_KEY, value: serialized })
                    .onConflictDoUpdate({
                        target: keyValue.key,
                        set: {
                            value: serialized,
                            updatedAt: sql`now()`,
                        },
                    })

                await auditTrailLogger(ctx, {
                    component: 'admin.settings',
                    action: 'update',
                    description: `Admin updated closing days (${closingDays.length} range(s))`,
                    records: {
                        table: 'key_value',
                        id: CLOSING_DAYS_KEY,
                    },
                })

                // Fetch other settings for the broadcast snapshot
                const otherRows = await ctx
                    .get('dbClient')
                    .select({ key: keyValue.key, value: keyValue.value })
                    .from(keyValue)
                    .where(
                        inArray(keyValue.key, [
                            ADVANCE_DAYS_KEY,
                            RESTAURANT_ADDRESS_KEY,
                            GCASH_ACCOUNT_NAME_KEY,
                            GCASH_NUMBER_KEY,
                            PAYMENT_INSTRUCTIONS_KEY,
                        ]),
                    )

                const byKey = Object.fromEntries(
                    otherRows.map((r) => [
                        r.key,
                        r.value,
                    ]),
                )

                const advanceDays = byKey[ADVANCE_DAYS_KEY]
                    ? parseInt(byKey[ADVANCE_DAYS_KEY]!, 10)
                    : DEFAULT_ADVANCE_DAYS

                const restaurantAddress = byKey[RESTAURANT_ADDRESS_KEY] ?? null

                await broadcastSettingsEvent(ctx.env, {
                    advanceDays,
                    restaurantAddress,
                    closingDays,
                    gcashAccountName: byKey[GCASH_ACCOUNT_NAME_KEY] ?? null,
                    gcashNumber: byKey[GCASH_NUMBER_KEY] ?? null,
                    paymentInstructions:
                        byKey[PAYMENT_INSTRUCTIONS_KEY] ?? null,
                })

                return apiResponseOkWrapper(ctx, {
                    data: { closingDays },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'CLOSING_DAYS_UPDATE_FAILED',
                        message: 'Failed to update closing days.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )

export type SettingsRouteType = ApplyGlobalResponse<
    typeof settingsRoute,
    TGlobalApiResponses
>

export default settingsRoute
