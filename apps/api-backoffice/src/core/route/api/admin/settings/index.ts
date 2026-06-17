import { settings } from '@hyperion/validator/backoffice/admin/settings'
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

async function broadcastSettingsEvent(
    env: THonoInstance['Bindings'],
    data: unknown,
) {
    try {
        const id = env.HYPERIONPUB_DO_WSS.idFromName('settings')
        const stub = env.HYPERIONPUB_DO_WSS.get(id)
        await stub.sendMessage(
            JSON.stringify({ event: 'settings.update', data }),
        )
    } catch {
        // Non-fatal: WS broadcast failure should not abort the HTTP response
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

            return apiResponseOkWrapper(ctx, {
                data: { advanceDays, restaurantAddress },
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
            const { advanceDays, restaurantAddress } = ctx.req.valid('json')

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

                await broadcastSettingsEvent(ctx.env, {
                    advanceDays,
                    restaurantAddress: resolvedAddress,
                })

                return apiResponseOkWrapper(ctx, {
                    data: { advanceDays, restaurantAddress: resolvedAddress },
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

export type SettingsRouteType = ApplyGlobalResponse<
    typeof settingsRoute,
    TGlobalApiResponses
>

export default settingsRoute
