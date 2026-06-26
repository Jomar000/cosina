import { dbClient, dbSchema } from '@hyperion/database/postgres'
import type {
    TApiResponseOk,
    TApiResponsePaginatedOk,
} from '@hyperion/types/shared'
import { env } from 'cloudflare:workers'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { app } from '../../../src/core/index.js'
import { seedTestingCookies } from '../../utilities.js'

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
let originalMemberProfile: TProfileData | undefined
const touchedAddressIds = new Set<number>()

type TProfileData = {
    backupPhoneNumber: string | null
    firstName: string
    gender: 'MALE' | 'FEMALE'
    lastName: string
    middleName: string | null
    nameExtension: string | null
}

const profileUpdatePayload = {
    backupPhoneNumber: '09171234567',
    firstName: 'TEST',
    gender: 'MALE' as const,
    lastName: 'PROFILE',
}

let db: ReturnType<typeof dbClient>

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
    db = dbClient({
        host: env.HYPERIONPUB_HD.host,
        port: Number(env.HYPERIONPUB_HD.port) || 5432,
        database: env.HYPERIONPUB_HD.database,
        user: env.HYPERIONPUB_HD.user,
        pass: env.HYPERIONPUB_HD.password,
    })
    ;[
        privilegedCookie,
        standardCookie,
    ] = await seedTestingCookies()

    const { address, userProfile } = dbSchema

    const [profile] = await db
        .select({
            addressId: userProfile.addressId,
            backupPhoneNumber: userProfile.backupPhoneNumber,
            firstName: userProfile.firstName,
            gender: userProfile.gender,
            lastName: userProfile.lastName,
            middleName: userProfile.middleName,
            nameExtension: userProfile.nameExtension,
        })
        .from(userProfile)
        .where(eq(userProfile.userId, 'USER_003'))

    if (!profile) throw new Error('Seeded USER_003 profile was not found.')

    const { addressId, ...profileData } = profile
    originalMemberAddressId = addressId
    originalMemberProfile = profileData

    if (addressId) {
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
            .where(eq(address.id, addressId))
    }
})

afterAll(async () => {
    const { address, userProfile } = dbSchema

    try {
        await db
            .update(userProfile)
            .set({
                ...originalMemberProfile,
                addressId: originalMemberAddressId,
            })
            .where(eq(userProfile.userId, 'USER_003'))

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
        it('Admin profile list should return paginated metadata.', async () => {
            const response = await app.request(
                '/api/admin/user/profile/readMany?limit=2&offset=0&sortOrder=asc',
                {
                    method: 'GET',
                    headers: {
                        origin: env.URL_FRONTEND,
                        cookie: privilegedCookie,
                    },
                },
                env,
            )
            const responseJson =
                await response.json<TApiResponsePaginatedOk<TProfileData[]>>()

            expect(response.status).toBe(200)
            expect(Array.isArray(responseJson.data)).toBe(true)
            expect(responseJson.count).toBeGreaterThanOrEqual(
                responseJson.data.length,
            )
            expect(responseJson.limit).toBe(2)
            expect(responseJson.offset).toBe(0)
        })

        it('Profile reads and updates should return object data.', async () => {
            const userReadResponse = await app.request(
                '/api/user/profile/read',
                {
                    method: 'GET',
                    headers: {
                        origin: env.URL_FRONTEND,
                        cookie: standardCookie,
                    },
                },
                env,
            )
            const userReadJson =
                await userReadResponse.json<TApiResponseOk<TProfileData>>()

            expect(userReadResponse.status).toBe(200)
            expect(Array.isArray(userReadJson.data)).toBe(false)

            const userUpdateResponse = await app.request(
                '/api/user/profile/update',
                {
                    method: 'POST',
                    headers: {
                        origin: env.URL_FRONTEND,
                        'content-type': 'application/json',
                        cookie: standardCookie,
                    },
                    body: JSON.stringify(profileUpdatePayload),
                },
                env,
            )
            const userUpdateJson =
                await userUpdateResponse.json<TApiResponseOk<TProfileData>>()

            expect(userUpdateResponse.status).toBe(200)
            expect(Array.isArray(userUpdateJson.data)).toBe(false)

            const adminReadResponse = await app.request(
                '/api/admin/user/profile/read?userId=USER_003',
                {
                    method: 'GET',
                    headers: {
                        origin: env.URL_FRONTEND,
                        cookie: privilegedCookie,
                    },
                },
                env,
            )
            const adminReadJson =
                await adminReadResponse.json<TApiResponseOk<TProfileData>>()

            expect(adminReadResponse.status).toBe(200)
            expect(Array.isArray(adminReadJson.data)).toBe(false)

            const adminUpdateResponse = await app.request(
                '/api/admin/user/profile/update',
                {
                    method: 'POST',
                    headers: {
                        origin: env.URL_FRONTEND,
                        'content-type': 'application/json',
                        cookie: privilegedCookie,
                    },
                    body: JSON.stringify({
                        userId: 'USER_003',
                        ...profileUpdatePayload,
                    }),
                },
                env,
            )
            const adminUpdateJson =
                await adminUpdateResponse.json<TApiResponseOk<TProfileData>>()

            expect(adminUpdateResponse.status).toBe(200)
            expect(Array.isArray(adminUpdateJson.data)).toBe(false)
        })

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
    const { auditTrail } = dbSchema

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
}

async function getMemberAddressId() {
    const { userProfile } = dbSchema

    const [profile] = await db
        .select({ addressId: userProfile.addressId })
        .from(userProfile)
        .where(eq(userProfile.userId, 'USER_003'))

    expect(profile.addressId).toBeTruthy()
    return profile.addressId!
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
