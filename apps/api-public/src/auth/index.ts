import { scryptAsync } from '@noble/hashes/scrypt.js'
import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { constantTimeEqual } from 'better-auth/crypto'
import {
    emailOTP,
    organization as organizationPlugin,
    username,
} from 'better-auth/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { eq, or } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { Resend } from 'resend'

import type { THonoBindings, THonoVariables } from '../types.js'
import type { aclBuilder } from './acl.js'

/**
 * @link
 * https://www.better-auth.com/docs/introduction
 */
export const auth = async (opts: {
    db: THonoVariables['dbClient']
    dbSchema: THonoVariables['dbSchema']
    kv: THonoVariables['kvClient']
    env: THonoBindings
    acl: Awaited<ReturnType<typeof aclBuilder>>
}) => {
    const { db, dbSchema, kv, env, acl } = opts

    const { organization: organizationTable } = dbSchema

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
     * Provides the ACL to the Organization plugin
     */
    const aclInstance = createAccessControl(acl.permissions)

    /**
     * @description
     * Derives a 64-byte key from a password and salt using scrypt (RFC 7914).
     * Password is NFKC-normalized and both inputs are explicitly converted to
     * Uint8Array for compatibility with {@link https://www.npmjs.com/package/@noble/hashes | @noble/hashes} ≥ 2.2.0,
     * which removed implicit string-to-bytes coercion.
     *
     * `maxmem` uses `(N + p + 1) * r * 128` — noble's internal accounting that
     * includes the `tmp` scratch block. This exceeds the RFC 7914 formula of
     * `(N + p) * r * 128` by one block and is specific to this implementation.
     *
     * @see {@link https://datatracker.ietf.org/doc/html/rfc7914 | RFC 7914 — scrypt}
     */
    const generateKey = async (password: string, salt: string) => {
        return scryptAsync(
            utf8ToBytes(password.normalize('NFKC')),
            utf8ToBytes(salt),
            {
                ...scryptOpts,
                maxmem: (scryptOpts.N + scryptOpts.p + 1) * scryptOpts.r * 128,
            },
        )
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
        database: drizzleAdapter(db, {
            provider: 'pg',
            schema: dbSchema,
        }),
        databaseHooks: {
            session: {
                create: {
                    before: async (session, ctx) => {
                        const organizationId = ctx?.query?.organizationId

                        let activeOrganizationId = ''

                        // Check if the provided organizationId is valid.
                        // If yes, set it as the activeOrganizationId for this session.
                        if (organizationId)
                            activeOrganizationId =
                                (
                                    await db
                                        .select({ id: organizationTable.id })
                                        .from(organizationTable)
                                        .where(
                                            or(
                                                eq(
                                                    organizationTable.id,
                                                    organizationId,
                                                ),
                                                eq(
                                                    organizationTable.slug,
                                                    organizationId,
                                                ),
                                            ),
                                        )
                                )[0]?.id ?? ''

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
        emailVerification: {
            sendOnSignUp: false,
            sendVerificationEmail: async ({ user, token }) => {
                const verificationUrl = new URL(
                    '/verify-email',
                    env.URL_FRONTEND,
                )
                verificationUrl.searchParams.set('token', token)

                await resend.emails.send({
                    from: env.MAILER_ACCOUNT,
                    to: user.email,
                    subject: 'E-mail Verification',
                    text: verificationUrl.toString(),
                })
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
            sendResetPassword: async ({ user, url }) => {
                if (env.ENVIRONMENT === 'test') {
                    return
                }

                await resend.emails.send({
                    from: env.MAILER_ACCOUNT,
                    to: user.email,
                    subject: 'Password Reset',
                    text: url,
                })
            },
        },
        plugins: [
            emailOTP({
                generateOTP: () => nanoid(8).toUpperCase(),
                overrideDefaultEmailVerification: false,
                sendVerificationOTP: async ({ email, otp, type }) => {
                    if (env.ENVIRONMENT === 'test') {
                        return
                    }

                    if (type === 'sign-in') {
                        /* NOT IMPLEMENTED */
                    } else if (type === 'email-verification') {
                        await resend.emails.send({
                            from: env.MAILER_ACCOUNT,
                            to: email,
                            subject: 'E-mail Verification',
                            text: otp,
                        })
                    } else {
                        await resend.emails.send({
                            from: env.MAILER_ACCOUNT,
                            to: email,
                            subject: 'Password Reset',
                            text: otp,
                        })
                    }
                },
            }),
            organizationPlugin({
                ac: aclInstance,
                roles: Object.fromEntries(
                    Object.entries(acl.roles).map(
                        ([
                            role,
                            perms,
                        ]) => [
                            role,
                            aclInstance.newRole(perms),
                        ],
                    ),
                ),
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
