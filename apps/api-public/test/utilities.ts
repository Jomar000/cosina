import { dbClient, dbSchema } from '@cosina/database/postgres'
import type { TApiResponseError } from '@cosina/types/shared'
import { makeSignature } from 'better-auth/crypto'
import { env } from 'cloudflare:workers'
import { and, eq, inArray, like } from 'drizzle-orm'
import { nanoid } from 'nanoid'

import { getSessionCookieName } from '../src/auth/cookies.js'
import { app } from '../src/core/index.js'

type QueryValue =
    | string
    | number
    | boolean
    | readonly (string | number | boolean)[]
    | undefined

/**
 * @description
 * Builds a request path with URL-encoded query parameters. Array values are
 * appended as repeated query keys so GET endpoint tests match Hono's query
 * parser behavior.
 */
export const buildQueryPath = (
    path: string,
    query?: Record<string, QueryValue>,
) => {
    const params = new URLSearchParams()

    for (const [
        key,
        value,
    ] of Object.entries(query ?? {})) {
        if (value === undefined) continue

        if (Array.isArray(value)) {
            for (const item of value) params.append(key, String(item))
            continue
        }

        params.set(key, String(value))
    }

    const queryString = params.toString()
    return queryString ? `${path}?${queryString}` : path
}
/**
 * @description
 * Generates a unique name by combining a prefix with the current timestamp
 * and a short random alphanumeric suffix. Useful for seeding test records
 * that must not collide across parallel test runs.
 */
export const generateUniqueName = (prefix: string): string =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

/**
 * @description
 * Sends a GET request against the public app with the configured frontend
 * origin header and optional session cookie.
 */
export const getTestingRequest = async (
    path: string,
    options: {
        cookie?: string
        query?: Record<string, QueryValue>
    } = {},
): Promise<Response> => {
    return app.request(
        buildQueryPath(path, options.query),
        {
            method: 'GET',
            headers: {
                origin: env.URL_FRONTEND,
                ...(options.cookie ? { cookie: options.cookie } : {}),
            },
        },
        env,
    )
}

/**
 * @description
 * Sends a JSON POST request against the public app with the configured
 * frontend origin header and optional session cookie.
 */
export const postTestingRequest = async (
    path: string,
    options: {
        body?: Record<string, unknown>
        cookie?: string
    } = {},
): Promise<Response> => {
    return app.request(
        path,
        {
            method: 'POST',
            headers: {
                origin: env.URL_FRONTEND,
                'content-type': 'application/json',
                ...(options.cookie ? { cookie: options.cookie } : {}),
            },
            body: JSON.stringify(options.body ?? {}),
        },
        env,
    )
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
 * triggered the reset request, as storage is isolated per test file.
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
    const kvKeys = await env.COSINAPUB_KV.list({
        prefix: 'verification:reset-password:',
    })

    for (const key of kvKeys.keys) {
        const value = await env.COSINAPUB_KV.get(key.name)
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
        host: env.COSINAPUB_HD.host,
        port: Number(env.COSINAPUB_HD.port) || 5432,
        database: env.COSINAPUB_HD.database,
        user: env.COSINAPUB_HD.user,
        pass: env.COSINAPUB_HD.password,
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

/** Signs in one seeded identity for tests that exercise authentication itself. */
export const signInTestingUser = async (
    accountId: 'superadministrator' | 'administrator' | 'member',
) => {
    const response = await app.request(
        '/api/auth/signIn/username',
        {
            method: 'POST',
            headers: {
                origin: env.URL_FRONTEND,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                organizationId: 'superorganization',
                accountId,
                password: 'P@ssw0rd1234',
            }),
        },
        env,
    )

    return response.headers.getSetCookie().join('; ')
}

/**
 * Seeds Better Auth's KV-only session cache for the shared owner, member, and
 * administrator identities. The tuple order is owner, member, administrator.
 */
export const seedTestingCookies = async (): Promise<
    readonly [
        string,
        string,
        string,
    ]
> => {
    const db = dbClient({
        host: env.COSINAPUB_HD.host,
        port: Number(env.COSINAPUB_HD.port) || 5432,
        database: env.COSINAPUB_HD.database,
        user: env.COSINAPUB_HD.user,
        pass: env.COSINAPUB_HD.password,
    })
    const { organization, user } = dbSchema

    try {
        const users = await db
            .select()
            .from(user)
            .where(
                inArray(user.id, [
                    'USER_001',
                    'USER_002',
                    'USER_003',
                ]),
            )
        const [activeOrganization] = await db
            .select({ id: organization.id })
            .from(organization)
            .where(eq(organization.id, 'ORGANIZATION_001'))

        if (users.length !== 3 || !activeOrganization)
            throw new Error('Shared authentication seed data is incomplete.')

        const usersById = new Map(
            users.map((record) => [
                record.id,
                record,
            ]),
        )
        const expiresIn = Number(env.SESSION_EXPIRATION)
        const cookieName = getSessionCookieName(env.ENVIRONMENT)

        const cookies = await Promise.all(
            [
                'USER_001',
                'USER_003',
                'USER_002',
            ].map(async (userId) => {
                const seededUser = usersById.get(userId)
                if (!seededUser)
                    throw new Error(`Seeded user "${userId}" was not found.`)

                const now = new Date()
                const expiresAt = new Date(now.getTime() + expiresIn * 1000)
                const token = nanoid(32)
                const session = {
                    id: nanoid(),
                    token,
                    userId,
                    expiresAt,
                    ipAddress: '',
                    userAgent: '',
                    activeOrganizationId: activeOrganization.id,
                    createdAt: now,
                    updatedAt: now,
                }

                await Promise.all([
                    env.COSINAPUB_KV.put(
                        token,
                        JSON.stringify({ session, user: seededUser }),
                        { expirationTtl: expiresIn },
                    ),
                    env.COSINAPUB_KV.put(
                        `active-sessions-${userId}`,
                        JSON.stringify([
                            { token, expiresAt: expiresAt.getTime() },
                        ]),
                        { expirationTtl: expiresIn },
                    ),
                ])

                const signature = await makeSignature(
                    token,
                    env.BETTER_AUTH_SECRET,
                )
                const signedToken = encodeURIComponent(`${token}.${signature}`)

                return `${cookieName}=${signedToken}`
            }),
        )

        return [
            cookies[0],
            cookies[1],
            cookies[2],
        ]
    } finally {
        await db.$client.end()
    }
}

/**
 * @description
 * Extract the first error message from validatorIssues for DATA_VALIDATION errors.
 */
export const unpackError = (responseData: TApiResponseError): string => {
    if (
        responseData.error.code === 'DATA_VALIDATION' &&
        responseData.error.validatorIssues?.length
    ) {
        return responseData.error.validatorIssues[0].message
    }

    return responseData.error.message
}
