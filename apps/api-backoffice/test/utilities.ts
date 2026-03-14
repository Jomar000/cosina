import { dbClient, dbSchema } from '@hyperion/database/postgres'
import { env } from 'cloudflare:workers'
import { and, eq, like } from 'drizzle-orm'

import app from '../src/core/index.js'

export const setTestingCookies = async () => {
    const response = await Promise.all([
        app.request(
            '/app/auth/sign-in/username',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    organizationId: 'superorganization',
                    accountId: 'superadministrator',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        ),
        app.request(
            '/app/auth/sign-in/username',
            {
                method: 'POST',
                headers: {
                    origin: 'vitest-pool-worker',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    organizationId: 'superorganization',
                    accountId: 'member',
                    password: 'P@ssw0rd1234',
                }),
            },
            env,
        ),
    ])

    return [
        response[0].headers.getSetCookie().join('; '),
        response[1].headers.getSetCookie().join('; '),
    ] as const
}

/**
 * @description
 * Intercepts a password reset token for the given user ID.
 *
 * Tries secondaryStorage (KV) first, then falls back to the database
 * verification table. This ensures compatibility with better-auth
 * versions that store verification tokens in either location.
 *
 * When using KV, this must be called within the same test file that
 * triggered the reset request, as storage is isolated per test file
 * (see @cloudflare/vitest-pool-workers v0.13.0).
 *
 * - better-auth >=1.5.3 with secondaryStorage: KV key pattern
 *   "verification:reset-password:{token}"
 * - better-auth without secondaryStorage: DB verification table with
 *   identifier "reset-password:{token}"
 */
export const interceptPasswordResetToken = async (
    userId: string,
): Promise<string> => {
    /**
     * @description
     * Attempt 1: Read from KV (secondaryStorage).
     */
    const kvKeys = await env.HYPERIONBOFC_KV.list({
        prefix: 'verification:reset-password:',
    })

    for (const key of kvKeys.keys) {
        const value = await env.HYPERIONBOFC_KV.get(key.name)
        if (value) {
            const parsed = JSON.parse(value)
            if (parsed.value === userId) {
                return key.name.replace('verification:reset-password:', '')
            }
        }
    }

    /**
     * @description
     * Attempt 2: Fall back to database verification table.
     */
    const { verification } = dbSchema

    const db = dbClient({
        host: env.HYPERIONBOFC_HD.host,
        port: Number(env.HYPERIONBOFC_HD.port) || 5432,
        database: env.HYPERIONBOFC_HD.database,
        user: env.HYPERIONBOFC_HD.user,
        pass: env.HYPERIONBOFC_HD.password,
    })

    try {
        const records = await db
            .select({
                identifier: verification.identifier,
                value: verification.value,
            })
            .from(verification)
            .where(
                and(
                    eq(verification.value, userId),
                    like(verification.identifier, 'reset-password:%'),
                ),
            )

        if (records.length > 0) {
            return records[0].identifier.replace('reset-password:', '')
        }

        throw new Error(
            `No password reset token found for user "${userId}" in KV or database.`,
        )
    } finally {
        await db.$client.end()
    }
}
