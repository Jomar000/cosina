import { scryptAsync } from '@noble/hashes/scrypt.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { APIError } from 'better-auth/api'
import { constantTimeEqual } from 'better-auth/crypto'
import {
    captcha,
    createAuthMiddleware,
    organization as organizationPlugin,
    username,
} from 'better-auth/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { and, eq, or } from 'drizzle-orm'
import { nanoid } from 'nanoid'

import { aclBuilder } from './acl.js'

/**
 * @link
 * https://www.better-auth.com/docs/introduction
 */
export const auth = async (opts: {
    db: THonoVariables['dbClient']
    dbSchema: THonoVariables['dbSchema']
    kv: THonoVariables['kvClient']
    env: THonoBindings
}) => {
    const { db, dbSchema, kv, env } = opts

    const {
        member,
        organization: organizationTable,
        role,
        user,
        userAttribute,
    } = dbSchema

    const cookieAttrs = {
        domain: env.COOKIE_DOMAIN,
        httpOnly: true,
        partitioned: true,
        path: '/',
        sameSite: 'strict' as const,
        secure: true,
    }

    const scryptOpts = {
        N: 2 ** 14,
        r: 8,
        p: 1,
        dkLen: 64,
    }

    /**
     * @description
     * Provides the ACL to the sign-in hook
     */
    const { roles: aclRoles, permissions: aclPermissions } = await aclBuilder(
        db,
        dbSchema,
        kv,
    )

    /**
     * @description
     * Provides the ACL to the Organization plugin
     */
    const aclInstance = createAccessControl(aclPermissions)

    /**
     * @description
     * Customized scrypt key generation based on better-auth logic with minor tweaks.
     *
     * @link
     * https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/crypto/password.ts
     *
     * @link
     * https://github.com/paulmillr/noble-hashes?tab=readme-ov-file#scrypt
     */
    const generateKey = async (password: string, salt: string) => {
        return scryptAsync(password.normalize('NFKC'), salt, {
            ...scryptOpts,
            maxmem:
                scryptOpts.N * scryptOpts.r * scryptOpts.p * 128 +
                128 * scryptOpts.r * scryptOpts.p,
        })
    }

    /**
     * @description
     * Get organization member data
     */
    const getOrgMemberData = async ({
        organizationId,
        email,
        username,
    }: {
        organizationId: string
        email?: string
        username?: string
    }) => {
        if (!(email || username)) {
            return null
        }

        const orgMemberData =
            (
                await db
                    .select()
                    .from(user)
                    .innerJoin(member, eq(user.id, member.userId))
                    .innerJoin(
                        organizationTable,
                        eq(member.organizationId, organizationTable.id),
                    )
                    .innerJoin(role, eq(member.role, role.name))
                    .where(
                        and(
                            or(
                                email ? eq(user.email, email) : undefined,
                                username
                                    ? eq(user.username, username)
                                    : undefined,
                            ),
                            eq(organizationTable.slug, organizationId),
                        ),
                    )
            )[0] ?? null

        return orgMemberData
    }

    /**
     * @description
     * Verify if the user account is locked
     */
    const verifyAccountLock = async ({
        email,
        username,
    }: {
        email?: string
        username?: string
    }) => {
        if (!(email || username)) {
            return
        }

        const isLocked =
            (
                await db
                    .select({
                        isLocked: userAttribute.isLocked,
                    })
                    .from(userAttribute)
                    .innerJoin(user, eq(user.id, userAttribute.userId))
                    .where(
                        or(
                            email ? eq(user.email, email) : undefined,
                            username ? eq(user.username, username) : undefined,
                        ),
                    )
            )[0]?.isLocked ?? false

        if (isLocked) {
            throw new APIError('LOCKED', {
                code: undefined,
                success: false,
                message: 'Account is currently locked.',
            })
        }
    }

    return betterAuth({
        onAPIError: {
            throw: true,
        },
        advanced: {
            cookiePrefix: 'hyperion',
            defaultCookieAttributes: cookieAttrs,
            ipAddress: {
                ipAddressHeaders: [
                    'cf-connecting-ip',
                ],
                disableIpTracking: false,
            },
            useSecureCookies: true,
        },
        basePath: '/internal/auth',
        database: drizzleAdapter(db, {
            provider: 'pg',
        }),
        databaseHooks: {
            session: {
                create: {
                    before: async (session, ctx) => {
                        const { id: activeOrganizationId } = (
                            await db
                                .select({ id: organizationTable.id })
                                .from(organizationTable)
                                .where(
                                    or(
                                        eq(
                                            organizationTable.id,
                                            ctx?.query.organizationId,
                                        ),
                                        eq(
                                            organizationTable.slug,
                                            ctx?.query.organizationId,
                                        ),
                                    ),
                                )
                        )[0]

                        return {
                            data: {
                                ...session,
                                token: nanoid(32),
                                activeOrganizationId,
                            },
                        }
                    },
                },
            },
        },
        emailAndPassword: {
            enabled: true,
            autoSignIn: false,
            password: {
                hash: async (password) => {
                    const salt = nanoid(32)
                    const key = await generateKey(password, salt)
                    return `${salt}:${bytesToHex(key)}`
                },
                verify: async ({ hash, password }) => {
                    const [
                        salt,
                        key,
                    ] = hash.split(':')
                    const targetKey = await generateKey(password, salt)
                    return constantTimeEqual(hexToBytes(key), targetKey)
                },
            },
        },
        hooks: {
            before: createAuthMiddleware(async (ctx) => {
                if (ctx.path.startsWith('/sign-in/')) {
                    if (!ctx.query?.organizationId) {
                        throw new APIError('BAD_REQUEST', {
                            code: undefined,
                            success: false,
                            message: 'Organization ID was not provided.',
                        })
                    }

                    const orgMemberData = await getOrgMemberData({
                        organizationId: ctx.query.organizationId,
                        username: ctx.body.username,
                        email: ctx.body.email,
                    })

                    if (!orgMemberData) {
                        throw new APIError('UNPROCESSABLE_ENTITY', {
                            code: undefined,
                            success: false,
                            message: 'Invalid credentials provided.',
                        })
                    }

                    await verifyAccountLock({
                        username: ctx.body.username,
                        email: ctx.body.email,
                    })

                    // Inject member data to the request context
                    // and make it available to the after hook
                    ctx.context._name = orgMemberData.user.username
                    ctx.context._email = orgMemberData.user.email
                    ctx.context._avatar = orgMemberData.user.image
                    ctx.context._permissions = aclPermissions
                    ctx.context._roles = aclRoles
                    ctx.context._userRoles = orgMemberData.role.name.split(',')
                }
            }),
            after: createAuthMiddleware(async (ctx) => {
                if (ctx.path.startsWith('/sign-in/')) {
                    if (!ctx.context.newSession) {
                        throw new APIError('UNPROCESSABLE_ENTITY', {
                            code: undefined,
                            success: false,
                            message: 'Invalid credentials provided.',
                        })
                    }

                    return ctx.json({
                        success: true,
                        data: {
                            name: ctx.context._name,
                            email: ctx.context._email,
                            ...(ctx.context._avatar
                                ? { avatar: ctx.context._avatar }
                                : {}),
                            permissions: ctx.context._permissions,
                            roles: ctx.context._roles,
                            userRoles: ctx.context._userRoles,
                            expiresAt:
                                Math.floor(new Date().getTime() / 1000) +
                                Number(env.SESSION_EXPIRATION),
                        },
                    })
                }
            }),
        },
        plugins: [
            captcha({
                provider: 'cloudflare-turnstile',
                secretKey: env.CF_TURNSTILE_SECRET_KEY,
                siteVerifyURLOverride: env.CF_TURNSTILE_SITE_VERIFY,
                endpoints: [
                    '/forget-password',
                    '/sign-in/email',
                    '/sign-in/username',
                    '/sign-up/email',
                ],
            }),
            organizationPlugin({
                ac: aclInstance,
                roles: Object.keys(aclRoles)
                    .map((role) => ({
                        [role]: aclInstance.newRole(aclRoles[role]),
                    }))
                    .reduce((accumulator, value) => {
                        accumulator = { ...accumulator, ...value }
                        return accumulator
                    }, {}),
            }),
            username({
                usernameValidator: (value) => /^[\w-.]+$/.test(value),
                minUsernameLength: 6,
                maxUsernameLength: 36,
            }),
        ],
        secondaryStorage: {
            get: async (key) => await kv.get(key),
            set: async (key, value, ttl) => {
                ttl
                    ? await kv.put(key, value, {
                          expirationTtl: ttl,
                      })
                    : await kv.put(key, value)
            },
            delete: async (key) => await kv.delete(key),
        },
        session: {
            cookieCache: {
                enabled: true,
                maxAge: Number(env.SESSION_UPDATE_AGE),
            },
            expiresIn: Number(env.SESSION_EXPIRATION),
            updateAge: Number(env.SESSION_UPDATE_AGE),
        },
        trustedOrigins: env.ALLOWED_ORIGINS.split(','),
    })
}

export default auth
