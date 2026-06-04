import { settings } from '@hyperion/validator/backoffice/admin/settings'
import { eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'

import { AppError } from '../../../../../errors.js'
import type { THonoInstance } from '../../../../../types.js'
import {
    apiResponseOkWrapper,
    auditTrailLogger,
} from '../../../../../utilities/helpers.js'
import { validateRequest } from '../../../../middleware/validateRequest.js'

const ADVANCE_DAYS_KEY = 'order:settings:advanceDays'
const DEFAULT_ADVANCE_DAYS = 3

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
            const [row] = await ctx
                .get('dbClient')
                .select({ value: keyValue.value })
                .from(keyValue)
                .where(eq(keyValue.key, ADVANCE_DAYS_KEY))
                .limit(1)

            const advanceDays = row?.value
                ? parseInt(row.value, 10)
                : DEFAULT_ADVANCE_DAYS

            return apiResponseOkWrapper(ctx, { data: { advanceDays } })
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
            const { advanceDays } = ctx.req.valid('json')

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

                await auditTrailLogger(ctx, {
                    component: 'admin.settings',
                    action: 'update',
                    description: `Admin updated advance order days to ${advanceDays}`,
                    records: {
                        table: 'key_value',
                        id: ADVANCE_DAYS_KEY,
                    },
                })

                await broadcastSettingsEvent(ctx.env, { advanceDays })

                return apiResponseOkWrapper(ctx, { data: { advanceDays } })
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

export default settingsRoute
