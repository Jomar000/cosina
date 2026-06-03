import { dbClient, dbSchema } from '@hyperion/database/postgres'
import type { TApiResponseOk } from '@hyperion/types/shared'
import { env } from 'cloudflare:workers'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import app from '../../../src/core/index.js'
import { setTestingCookies } from '../../utilities.js'

let privilegedCookie: string
let standardCookie: string
let originalMemberAddress:
    | {
          cityMunicipality: string
          countryCode: string
          line1: string
          line2: string | null
          postalCode: string
          provinceStateRegion: string
      }
    | undefined
let originalMemberAddressId: number | null = null
let createdMemberProfile = false
const touchedAddressIds = new Set<number>()

const getDb = () =>
    dbClient({
        host: env.HYPERIONBOFC_HD.host,
        port: Number(env.HYPERIONBOFC_HD.port) || 5432,
        database: env.HYPERIONBOFC_HD.database,
        user: env.HYPERIONBOFC_HD.user,
        pass: env.HYPERIONBOFC_HD.password,
    })

const firstAddressPayload = {
    line1: '100 TEST STREET',
    line2: 'UNIT 1',
    cityMunicipality: 'TEST CITY',
    provinceStateRegion: 'TEST REGION',
    postalCode: '1000',
    countryCode: 'PH',
}

const secondAddressPayload = {
    line1: '200 TEST STREET',
    line2: 'UNIT 2',
    cityMunicipality: 'TEST CITY',
    provinceStateRegion: 'TEST REGION',
    postalCode: '2000',
    countryCode: 'PH',
}

beforeAll(async () => {
    ;[
        privilegedCookie,
        standardCookie,
    ] = await setTestingCookies()

    const db = getDb()
    const { address, userProfile } = dbSchema

    try {
        let [profile] = await db
            .select({ addressId: userProfile.addressId })
            .from(userProfile)
            .where(eq(userProfile.userId, 'USER_003'))

        if (!profile) {
            ;[profile] = await db
                .insert(userProfile)
                .values({
                    userId: 'USER_003',
                    firstName: 'MEMBER',
                    lastName: 'MEMBER',
                    gender: 'MALE',
                    backupPhoneNumber: '09170000000',
                })
                .returning({ addressId: userProfile.addressId })
            createdMemberProfile = true
        }

        originalMemberAddressId = profile.addressId

        if (profile.addressId) {
            ;[originalMemberAddress] = await db
                .select({
                    cityMunicipality: address.cityMunicipality,
                    countryCode: address.countryCode,
                    line1: address.line1,
                    line2: address.line2,
                    postalCode: address.postalCode,
                    provinceStateRegion: address.provinceStateRegion,
                })
                .from(address)
                .where(eq(address.id, profile.addressId))
        }
    } finally {
        await db.$client.end()
    }
})

afterAll(async () => {
    const db = getDb()
    const { address, userProfile } = dbSchema

    try {
        if (createdMemberProfile) {
            await db
                .delete(userProfile)
                .where(eq(userProfile.userId, 'USER_003'))
        } else {
            await db
                .update(userProfile)
                .set({ addressId: originalMemberAddressId })
                .where(eq(userProfile.userId, 'USER_003'))
        }

        if (originalMemberAddressId && originalMemberAddress) {
            await db
                .update(address)
                .set(originalMemberAddress)
                .where(eq(address.id, originalMemberAddressId))
        }

        const removableAddressIds = [
            ...touchedAddressIds,
        ].filter((id) => id !== originalMemberAddressId)

        if (removableAddressIds.length > 0) {
            await db
                .delete(address)
                .where(inArray(address.id, removableAddressIds))
        }
    } finally {
        await db.$client.end()
    }
})

describe('User Profile Endpoint', () => {
    describe('Sequential Tests', () => {
        it('User address update should write previous address ID in audit trail oldData.', async () => {
            await updateUserAddress(firstAddressPayload)
            const previousAddressId = await getMemberAddressId()
            touchedAddressIds.add(previousAddressId)

            await updateUserAddress(secondAddressPayload)
            const currentAddressId = await getMemberAddressId()
            touchedAddressIds.add(currentAddressId)

            const auditRecords = await getLatestAuditRecords({
                action: 'update.address',
                component: 'user.profile',
            })

            expect(auditRecords[0]).toMatchObject({
                table: 'user_profile',
                id: 'USER_003',
                oldData: {
                    addressId: previousAddressId,
                },
            })
        })

        it('Admin address update should write previous address ID in audit trail oldData.', async () => {
            const previousAddressId = await getMemberAddressId()

            const response = await app.request(
                '/api/admin/user/profile/update/address',
                {
                    method: 'POST',
                    headers: {
                        origin: env.URL_FRONTEND,
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        userId: 'USER_003',
                        ...firstAddressPayload,
                        line1: '300 ADMIN TEST STREET',
                    }),
                },
                env,
            )

            const responseData =
                await response.json<
                    TApiResponseOk<typeof firstAddressPayload>
                >()

            expect(response.status).toBe(200)
            expect(responseData.success).toBe(true)

            const currentAddressId = await getMemberAddressId()
            touchedAddressIds.add(currentAddressId)

            const auditRecords = await getLatestAuditRecords({
                action: 'update.address',
                component: 'admin.user.profile',
            })

            expect(auditRecords[0]).toMatchObject({
                table: 'user_profile',
                id: 'USER_003',
                oldData: {
                    addressId: previousAddressId,
                },
            })
        })
    })
})

async function getLatestAuditRecords({
    action,
    component,
}: {
    action: string
    component: string
}) {
    const db = getDb()
    const { auditTrail } = dbSchema

    try {
        const [auditTrailEntry] = await db
            .select({ records: auditTrail.records })
            .from(auditTrail)
            .where(
                and(
                    eq(auditTrail.component, component),
                    eq(auditTrail.action, action),
                ),
            )
            .orderBy(desc(auditTrail.id))
            .limit(1)

        expect(auditTrailEntry.records).toBeTruthy()
        return auditTrailEntry.records!
    } finally {
        await db.$client.end()
    }
}

async function getMemberAddressId() {
    const db = getDb()
    const { userProfile } = dbSchema

    try {
        const [profile] = await db
            .select({ addressId: userProfile.addressId })
            .from(userProfile)
            .where(eq(userProfile.userId, 'USER_003'))

        expect(profile.addressId).toBeTruthy()
        return profile.addressId!
    } finally {
        await db.$client.end()
    }
}

async function updateUserAddress(body: typeof firstAddressPayload) {
    const response = await app.request(
        '/api/user/profile/update/address',
        {
            method: 'POST',
            headers: {
                origin: env.URL_FRONTEND,
                'content-type': 'application/json',
                cookie: standardCookie,
            },
            body: JSON.stringify(body),
        },
        env,
    )

    const responseData =
        await response.json<TApiResponseOk<typeof firstAddressPayload>>()

    expect(response.status).toBe(200)
    expect(responseData.success).toBe(true)
}
