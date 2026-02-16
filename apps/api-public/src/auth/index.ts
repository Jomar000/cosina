import { scryptAsync } from '@noble/hashes/scrypt.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { constantTimeEqual } from 'better-auth/crypto'
import {
    captcha,
    createAuthMiddleware,
    emailOTP,
    organization as organizationPlugin,
    username,
} from 'better-auth/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { and, eq, or } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { Resend } from 'resend'

import { AppError } from '../errors.js'
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

    const resend = new Resend(env.RESEND_API_KEY)

    const scryptOpts = {
        N: 2 ** 15,
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
            throw new AppError({
                code: 'LOCKED',
                message: 'Account is currently locked.',
                status: 423,
            })
        }
    }

    return betterAuth({
        onAPIError: {
            throw: true,
        },
        advanced: {
            cookiePrefix: 'sentinel',
            defaultCookieAttributes: cookieAttrs,
            ipAddress: {
                ipAddressHeaders: [
                    'cf-connecting-ip',
                ],
                disableIpTracking: false,
            },
            useSecureCookies: true,
        },
        baseURL: env.URL_BACKEND,
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
                if (
                    ctx.path.startsWith('/sign-in/email') ||
                    ctx.path.startsWith('/sign-in/username')
                ) {
                    if (!ctx.query?.organizationId) {
                        throw new AppError({
                            code: 'BAD_REQUEST',
                            message: 'Organization ID was not provided.',
                            status: 400,
                        })
                    }

                    const orgMemberData = await getOrgMemberData({
                        organizationId: ctx.query.organizationId,
                        username: ctx.body.username,
                        email: ctx.body.email,
                    })

                    if (!orgMemberData) {
                        throw new AppError({
                            code: 'UNPROCESSABLE_CONTENT',
                            message: 'Invalid credentials provided.',
                            status: 422,
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
                if (
                    ctx.path.startsWith('/sign-in/email') ||
                    ctx.path.startsWith('/sign-in/username')
                ) {
                    if (!ctx.context.newSession) {
                        throw new AppError({
                            code: 'UNPROCESSABLE_CONTENT',
                            message: 'Invalid credentials provided.',
                            status: 422,
                        })
                    }

                    return ctx.json({
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
            ...(env.ENVIRONMENT === 'test'
                ? []
                : [
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
                  ]),
            emailOTP({
                overrideDefaultEmailVerification: true,
                sendVerificationOTP: async ({ email, otp, type }) => {
                    if (type === 'sign-in') {
                        /* NOT IMPLEMENTED */
                    } else if (type === 'email-verification') {
                        await resend.emails.send({
                            from: env.MAILER_ACCOUNT,
                            to: email,
                            subject: 'E-mail Verification',
                            text: `${otp}`,
                        })
                    } else {
                        await resend.emails.send({
                            from: env.MAILER_ACCOUNT,
                            to: email,
                            subject: 'Password Reset',
                            text: `${otp}`,
                        })
                    }
                },
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
                if (ttl) {
                    /**
                     * @description
                     * Added this logic as Workers KV only supports a minimum of 60 seconds for TTL.
                     *
                     * @link
                     * https://github.com/better-auth/better-auth/issues/5452
                     */
                    await kv.put(key, value, {
                        expirationTtl: ttl >= 60 ? ttl : 60,
                    })
                } else {
                    await kv.put(key, value)
                }
            },
            delete: async (key) => await kv.delete(key),
        },
        session: {
            expiresIn: Number(env.SESSION_EXPIRATION),
            updateAge: Number(env.SESSION_UPDATE_AGE),
        },
        trustedOrigins: [env.URL_FRONTEND],
    })
}

export default auth
