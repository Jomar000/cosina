import type { TApiResponseError, TApiResponseOk } from '@hyperion/types/shared'
import { env } from 'cloudflare:workers'
import { beforeAll, describe, expect, it } from 'vitest'

import app from '../../src/core/index.js'
import { setTestingCookies } from '../utilities.js'

let privilegedCookie: string
let standardCookie: string

beforeAll(async () => {
    ;[
        privilegedCookie,
        standardCookie,
    ] = await setTestingCookies()
})

describe('Object Storage Endpoint', () => {
    /**
     * @description
     * Authentication Guard
     */
    describe('Authentication Guard', () => {
        it('Unauthenticated request to /upload/create should return 401.', async () => {
            const response = await app.request(
                '/app/objectStorage/upload/create',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                    },
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(401)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.code).toBe('UNAUTHORIZED')
        })

        it('Unauthenticated request to /download/link/create should return 401.', async () => {
            const response = await app.request(
                '/app/objectStorage/download/link/create',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        uploadId: 'a1b2c3d4e5f6g7h8',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(401)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.code).toBe('UNAUTHORIZED')
        })

        it('Unauthenticated request to /upload/commit should return 401.', async () => {
            const response = await app.request(
                '/app/objectStorage/upload/commit',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        uploadId: 'a1b2c3d4e5f6g7h8',
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(401)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.code).toBe('UNAUTHORIZED')
        })

        it('Unauthenticated request to /upload/attachment/create should return 401.', async () => {
            const response = await app.request(
                '/app/objectStorage/upload/attachment/create',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        uploadId: 'a1b2c3d4e5f6g7h8',
                        attachments: [],
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(401)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.code).toBe('UNAUTHORIZED')
        })

        it('Unauthenticated request to /upload/attachment/retry should return 401.', async () => {
            const response = await app.request(
                '/app/objectStorage/upload/attachment/retry',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        uploadId: 'a1b2c3d4e5f6g7h8',
                        attachments: [],
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(401)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.code).toBe('UNAUTHORIZED')
        })

        it('Unauthenticated request to /upload/attachment/commit should return 401.', async () => {
            const response = await app.request(
                '/app/objectStorage/upload/attachment/commit',
                {
                    method: 'POST',
                    headers: {
                        origin: 'vitest-pool-worker',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        uploadId: 'a1b2c3d4e5f6g7h8',
                        attachments: [],
                    }),
                },
                env,
            )

            const responseData = await response.json<TApiResponseError>()

            expect(response.status).toBe(401)
            expect(responseData).toHaveProperty('error')
            expect(responseData.error.code).toBe('UNAUTHORIZED')
        })
    })

    /**
     * @description
     * Upload Flow
     */
    describe('Upload Flow', () => {
        describe('Create Upload', () => {
            it('Privileged user should be able to create an upload.', async () => {
                const response = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const responseData =
                    await response.json<TApiResponseOk<{ uploadId: string }>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data.uploadId).toBeDefined()
                expect(responseData.data.uploadId).toHaveLength(16)
            })

            it('Standard user should be able to create an upload.', async () => {
                const response = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: standardCookie,
                        },
                    },
                    env,
                )

                const responseData =
                    await response.json<TApiResponseOk<{ uploadId: string }>>()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data.uploadId).toBeDefined()
                expect(responseData.data.uploadId).toHaveLength(16)
            })
        })

        describe('Create Upload Attachment', () => {
            it('Should create attachment with valid input and return signed URLs.', async () => {
                // Step 1: Create an upload
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId = uploadData.data.uploadId

                // Step 2: Create attachment
                const response = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: 'a'.repeat(64),
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: {
                            id: string
                            hashSha256: string
                            encodedHash: string | null
                            signedUrl: string | null
                            status: number
                        }[]
                    }>
                >()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(
                    responseData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                expect(responseData.data.uploadId).toBe(uploadId)
                expect(responseData.data.signedUrls).toHaveLength(1)
                expect(responseData.data.signedUrls[0].status).toBe(201)
                expect(responseData.data.signedUrls[0].signedUrl).toBeTruthy()
                expect(responseData.data.signedUrls[0].encodedHash).toBeTruthy()
            })

            it('Should reject attachment with invalid upload ID.', async () => {
                const response = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId: 'nonexistent1234ab',
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: 'b'.repeat(64),
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(404)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe(
                    'Upload ID not found or is already committed.',
                )
            })

            it('Should reject attachment with empty attachments array.', async () => {
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()

                const response = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId: uploadData.data.uploadId,
                            attachments: [],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Should reject attachment with invalid SHA-256 hash.', async () => {
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()

                const response = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId: uploadData.data.uploadId,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: 'invalidhash',
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Should reject attachment with duplicate SHA-256 hashes.', async () => {
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()

                const duplicateHash = 'c'.repeat(64)

                const response = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId: uploadData.data.uploadId,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: duplicateHash,
                                    isPublic: false,
                                },
                                {
                                    size: 2048,
                                    hashSha256: duplicateHash,
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it("Standard user should not access another user's upload.", async () => {
                // Create upload as privileged user
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()

                // Attempt to attach as standard user
                const response = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            uploadId: uploadData.data.uploadId,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: 'd'.repeat(64),
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(404)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe(
                    'Upload ID not found or is already committed.',
                )
            })

            it('Should return 409 for already uploaded (deduplicated) attachment.', async () => {
                // Step 1: Create first upload and add attachment
                const upload1Response = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const upload1Data =
                    await upload1Response.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId1 = upload1Data.data.uploadId

                const sharedHash = 'e'.repeat(64)

                const attach1Response = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId: uploadId1,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: sharedHash,
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const attach1Data = await attach1Response.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: {
                            id: string
                            status: number
                        }[]
                    }>
                >()

                expect(
                    attach1Data.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()

                // Step 2: Mark the attachment as uploaded
                await app.request(
                    '/app/objectStorage/upload/attachment/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId: uploadId1,
                            attachments: [
                                attach1Data.data.signedUrls[0].id,
                            ],
                        }),
                    },
                    env,
                )

                // Step 3: Create second upload and try the same hash
                const upload2Response = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const upload2Data =
                    await upload2Response.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()

                const response = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId: upload2Data.data.uploadId,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: sharedHash,
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: {
                            id: string
                            hashSha256: string
                            signedUrl: string | null
                            status: number
                        }[]
                    }>
                >()

                expect(response.status).toBe(200)
                expect(
                    responseData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                expect(responseData.data.signedUrls[0].status).toBe(409)
                expect(responseData.data.signedUrls[0].signedUrl).toBeNull()
            })
        })

        describe('Retry Upload Attachment', () => {
            it('Should regenerate signed URLs for non-uploaded attachments.', async () => {
                // Create upload and attachment
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId = uploadData.data.uploadId

                const attachResponse = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [
                                {
                                    size: 512,
                                    hashSha256: 'f'.repeat(64),
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const attachData = await attachResponse.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: { id: string; status: number }[]
                    }>
                >()

                expect(
                    attachData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                const attachmentId = attachData.data.signedUrls[0].id

                // Retry the attachment
                const response = await app.request(
                    '/app/objectStorage/upload/attachment/retry',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: {
                            id: string
                            signedUrl: string | null
                            status: number
                        }[]
                    }>
                >()

                expect(response.status).toBe(200)
                expect(
                    responseData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                expect(responseData.data.signedUrls).toHaveLength(1)
                expect(responseData.data.signedUrls[0].status).toBe(200)
                expect(responseData.data.signedUrls[0].signedUrl).toBeTruthy()
            })

            it('Should return 404 for non-existent attachment IDs.', async () => {
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()

                const response = await app.request(
                    '/app/objectStorage/upload/attachment/retry',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId: uploadData.data.uploadId,
                            attachments: [
                                'nonexistent'.padEnd(32, '0'),
                            ],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: {
                            id: string
                            signedUrl: string | null
                            status: number
                        }[]
                    }>
                >()

                expect(response.status).toBe(200)
                expect(
                    responseData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                expect(responseData.data.signedUrls[0].status).toBe(404)
                expect(responseData.data.signedUrls[0].signedUrl).toBeNull()
            })

            it('Should return 409 for already uploaded attachments.', async () => {
                // Create upload, attach, and commit
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId = uploadData.data.uploadId

                const attachResponse = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [
                                {
                                    size: 256,
                                    hashSha256: '1'.repeat(64),
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const attachData = await attachResponse.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: { id: string; status: number }[]
                    }>
                >()

                expect(
                    attachData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                const attachmentId = attachData.data.signedUrls[0].id

                // Mark as uploaded
                await app.request(
                    '/app/objectStorage/upload/attachment/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                // Retry should return 409
                const response = await app.request(
                    '/app/objectStorage/upload/attachment/retry',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: {
                            id: string
                            signedUrl: string | null
                            status: number
                        }[]
                    }>
                >()

                expect(response.status).toBe(200)
                expect(
                    responseData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                expect(responseData.data.signedUrls[0].status).toBe(409)
                expect(responseData.data.signedUrls[0].signedUrl).toBeNull()
            })
        })

        describe('Commit Upload Attachment', () => {
            it('Should mark attachments as uploaded.', async () => {
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId = uploadData.data.uploadId

                const attachResponse = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [
                                {
                                    size: 2048,
                                    hashSha256: '2'.repeat(64),
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const attachData = await attachResponse.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: { id: string; status: number }[]
                    }>
                >()

                expect(
                    attachData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                const attachmentId = attachData.data.signedUrls[0].id

                const response = await app.request(
                    '/app/objectStorage/upload/attachment/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<
                    TApiResponseOk<{
                        uploadId: string
                        attachments: string[]
                    }>
                >()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data.uploadId).toBe(uploadId)
                expect(responseData.data.attachments).toContain(attachmentId)
            })

            it('Should reject commit for non-existent upload ID.', async () => {
                const response = await app.request(
                    '/app/objectStorage/upload/attachment/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId: 'nonexistent1234ab',
                            attachments: [
                                'nonexistent'.padEnd(32, '0'),
                            ],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(404)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe(
                    'Upload ID not found or is already committed.',
                )
            })
        })

        describe('Commit Upload', () => {
            it('Should commit an upload with attachments.', async () => {
                // Full flow: create → attach → attachment commit → upload commit
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId = uploadData.data.uploadId

                const attachResponse = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [
                                {
                                    size: 4096,
                                    hashSha256: '3'.repeat(64),
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const attachData = await attachResponse.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: { id: string; status: number }[]
                    }>
                >()

                expect(
                    attachData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                const attachmentId = attachData.data.signedUrls[0].id

                // Mark attachment as uploaded
                await app.request(
                    '/app/objectStorage/upload/attachment/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                // Commit the upload
                const response = await app.request(
                    '/app/objectStorage/upload/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<
                    TApiResponseOk<{
                        uploadId: string
                        attachments: string[]
                    }>
                >()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data.uploadId).toBe(uploadId)
                expect(responseData.data.attachments).toContain(attachmentId)
            })

            it('Should reject commit for already committed upload.', async () => {
                // Create and commit an upload first
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId = uploadData.data.uploadId

                // Commit with no attachments
                await app.request(
                    '/app/objectStorage/upload/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({ uploadId }),
                    },
                    env,
                )

                // Try to commit again
                const response = await app.request(
                    '/app/objectStorage/upload/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({ uploadId }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(404)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe(
                    'Upload ID not found or is already committed.',
                )
            })

            it('Should purge unselected attachments on commit.', async () => {
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId = uploadData.data.uploadId

                // Add two attachments
                const attachResponse = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: '4'.repeat(64),
                                    isPublic: false,
                                },
                                {
                                    size: 2048,
                                    hashSha256: '5'.repeat(64),
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const attachData = await attachResponse.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: { id: string; status: number }[]
                    }>
                >()

                expect(
                    attachData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                const keepAttachmentId = attachData.data.signedUrls[0].id

                // Commit with only the first attachment (purge the second)
                const response = await app.request(
                    '/app/objectStorage/upload/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [keepAttachmentId],
                        }),
                    },
                    env,
                )

                const responseData = await response.json<
                    TApiResponseOk<{
                        uploadId: string
                        attachments: string[]
                    }>
                >()

                expect(response.status).toBe(200)
                expect(responseData.data.attachments).toHaveLength(1)
                expect(responseData.data.attachments).toContain(
                    keepAttachmentId,
                )
            })

            it("Standard user should not commit another user's upload.", async () => {
                // Create upload as privileged user
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()

                // Attempt commit as standard user
                const response = await app.request(
                    '/app/objectStorage/upload/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            uploadId: uploadData.data.uploadId,
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(404)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe(
                    'Upload ID not found or is already committed.',
                )
            })
        })
    })

    /**
     * @description
     * Download Flow
     */
    describe('Download Flow', () => {
        describe('Create Download Link', () => {
            it('Should create download links for own upload.', async () => {
                // Full upload flow first
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: standardCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId = uploadData.data.uploadId

                const attachResponse = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: '6'.repeat(64),
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const attachData = await attachResponse.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: { id: string; status: number }[]
                    }>
                >()

                expect(
                    attachData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                const attachmentId = attachData.data.signedUrls[0].id

                // Mark as uploaded and commit
                await app.request(
                    '/app/objectStorage/upload/attachment/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                await app.request(
                    '/app/objectStorage/upload/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                // Request download links
                const response = await app.request(
                    '/app/objectStorage/download/link/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({ uploadId }),
                    },
                    env,
                )

                const responseData = await response.json<
                    TApiResponseOk<{
                        downloadUrls: {
                            objectStorageId: string
                            downloadUrl: string | null
                            status: number
                        }[]
                    }>
                >()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data.downloadUrls).toHaveLength(1)
                expect(
                    responseData.data.downloadUrls[0].downloadUrl,
                ).toBeTruthy()
            })

            it("Standard user should not access another user's upload download links.", async () => {
                // Create upload as privileged user
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: privilegedCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId = uploadData.data.uploadId

                const attachResponse = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: '7'.repeat(64),
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const attachData = await attachResponse.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: { id: string; status: number }[]
                    }>
                >()

                expect(
                    attachData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                const attachmentId = attachData.data.signedUrls[0].id

                await app.request(
                    '/app/objectStorage/upload/attachment/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                await app.request(
                    '/app/objectStorage/upload/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                // Standard user tries to get download links
                const response = await app.request(
                    '/app/objectStorage/download/link/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({ uploadId }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(404)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe('Upload ID not found.')
            })

            it("Privileged user should access any user's upload download links.", async () => {
                // Create upload as standard user
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: standardCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId = uploadData.data.uploadId

                const attachResponse = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: '8'.repeat(64),
                                    isPublic: false,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const attachData = await attachResponse.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: { id: string; status: number }[]
                    }>
                >()

                expect(
                    attachData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                const attachmentId = attachData.data.signedUrls[0].id

                await app.request(
                    '/app/objectStorage/upload/attachment/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                await app.request(
                    '/app/objectStorage/upload/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                // Privileged user requests download links
                const response = await app.request(
                    '/app/objectStorage/download/link/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({ uploadId }),
                    },
                    env,
                )

                const responseData = await response.json<
                    TApiResponseOk<{
                        downloadUrls: {
                            objectStorageId: string
                            downloadUrl: string | null
                            status: number
                        }[]
                    }>
                >()

                expect(response.status).toBe(200)
                expect(responseData.success).toBe(true)
                expect(responseData.data.downloadUrls).toHaveLength(1)
                expect(
                    responseData.data.downloadUrls[0].downloadUrl,
                ).toBeTruthy()
            })

            it('Should fail with non-existent upload ID.', async () => {
                const response = await app.request(
                    '/app/objectStorage/download/link/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId: 'nonexistent1234ab',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(404)
                expect(responseData).toHaveProperty('error')
                expect(responseData.error.message).toBe('Upload ID not found.')
            })

            it('Should reject invalid upload ID format.', async () => {
                const response = await app.request(
                    '/app/objectStorage/download/link/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: privilegedCookie,
                        },
                        body: JSON.stringify({
                            uploadId: 'short',
                        }),
                    },
                    env,
                )

                const responseData = await response.json<TApiResponseError>()

                expect(response.status).toBe(400)
                expect(responseData).toHaveProperty('error')
            })

            it('Should return public URL for public objects.', async () => {
                const uploadResponse = await app.request(
                    '/app/objectStorage/upload/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            cookie: standardCookie,
                        },
                    },
                    env,
                )

                const uploadData =
                    await uploadResponse.json<
                        TApiResponseOk<{ uploadId: string }>
                    >()
                const uploadId = uploadData.data.uploadId

                const attachResponse = await app.request(
                    '/app/objectStorage/upload/attachment/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256: '9'.repeat(64),
                                    isPublic: true,
                                },
                            ],
                        }),
                    },
                    env,
                )

                const attachData = await attachResponse.json<
                    TApiResponseOk<{
                        uploadId: string
                        signedUrls: { id: string; status: number }[]
                    }>
                >()

                expect(
                    attachData.data?.signedUrls,
                    'Expected signedUrls to be present in the response',
                ).toBeDefined()
                const attachmentId = attachData.data.signedUrls[0].id

                await app.request(
                    '/app/objectStorage/upload/attachment/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                await app.request(
                    '/app/objectStorage/upload/commit',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({
                            uploadId,
                            attachments: [attachmentId],
                        }),
                    },
                    env,
                )

                const response = await app.request(
                    '/app/objectStorage/download/link/create',
                    {
                        method: 'POST',
                        headers: {
                            origin: 'vitest-pool-worker',
                            'content-type': 'application/json',
                            cookie: standardCookie,
                        },
                        body: JSON.stringify({ uploadId }),
                    },
                    env,
                )

                const responseData = await response.json<
                    TApiResponseOk<{
                        downloadUrls: {
                            objectStorageId: string
                            downloadUrl: string | null
                            status: number
                        }[]
                    }>
                >()

                expect(response.status).toBe(200)
                expect(responseData.data.downloadUrls).toHaveLength(1)
                expect(responseData.data.downloadUrls[0].status).toBe(201)
                expect(
                    responseData.data.downloadUrls[0].downloadUrl,
                ).toBeTruthy()
                // Public objects use the public bucket URL (not a signed URL)
                expect(
                    responseData.data.downloadUrls[0].downloadUrl,
                ).not.toContain('X-Amz')
            })
        })
    })
})
