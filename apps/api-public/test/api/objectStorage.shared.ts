import type {
    TApiResponseError,
    TApiResponseOk,
    TApiResponsePaginatedOk,
} from '@hyperion/types/shared'
import { env } from 'cloudflare:workers'
import { v7 as uuidv7 } from 'uuid'
import { beforeAll, describe, expect, it } from 'vitest'

import { app } from '../../src/core/index.js'
import { seedTestingCookies } from '../utilities.js'

let privilegedCookie: string
let standardCookie: string

beforeAll(async () => {
    ;[
        privilegedCookie,
        standardCookie,
    ] = await seedTestingCookies()
})

const createHashSha256 = () => crypto.randomUUID().replaceAll('-', '').repeat(2)

const createUpload = async (cookie = privilegedCookie) => {
    const response = await app.request(
        '/api/objectStorage/upload/create',
        {
            method: 'POST',
            headers: {
                origin: env.URL_FRONTEND,
                'content-type': 'application/json',
                cookie,
            },
            body: JSON.stringify({
                idempotencyKey: uuidv7(),
            }),
        },
        env,
    )

    const responseData =
        await response.json<TApiResponseOk<{ uploadId: string }>>()
    expect(response.status).toBe(200)
    return responseData.data.uploadId
}

const createUploadAttachment = async (
    uploadId: string,
    cookie = privilegedCookie,
    isPublic = false,
) => {
    const response = await app.request(
        '/api/objectStorage/upload/attachment/create',
        {
            method: 'POST',
            headers: {
                origin: env.URL_FRONTEND,
                'content-type': 'application/json',
                cookie,
            },
            body: JSON.stringify({
                uploadId,
                attachments: [
                    {
                        size: 1024,
                        hashSha256: createHashSha256(),
                        isPublic,
                    },
                ],
            }),
        },
        env,
    )

    const responseData = await response.json<
        TApiResponseOk<{
            signedUrls: { id: string }[]
        }>
    >()
    expect(response.status).toBe(200)
    return responseData.data.signedUrls[0].id
}

const commitUploadAttachment = async (uploadId: string, attachmentId: string) =>
    await app.request(
        '/api/objectStorage/upload/attachment/commit',
        {
            method: 'POST',
            headers: {
                origin: env.URL_FRONTEND,
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

const commitUpload = async (uploadId: string, attachments?: string[]) =>
    await app.request(
        '/api/objectStorage/upload/commit',
        {
            method: 'POST',
            headers: {
                origin: env.URL_FRONTEND,
                'content-type': 'application/json',
                cookie: privilegedCookie,
            },
            body: JSON.stringify(
                attachments === undefined
                    ? { uploadId }
                    : {
                          uploadId,
                          attachments,
                      },
            ),
        },
        env,
    )

export const registerConcurrentObjectStorageTests = () =>
    describe('Object Storage Endpoint', () => {
        describe.concurrent('Concurrent Tests', () => {
            /**
             * @description
             * Authentication Guard
             */
            describe.concurrent('Authentication Guard', () => {
                it('Unauthenticated request to /upload/create should return 401.', async () => {
                    const response = await app.request(
                        '/api/objectStorage/upload/create',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                idempotencyKey: uuidv7(),
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(401)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.code).toBe('UNAUTHORIZED')
                })

                it('Unauthenticated request to /download/link/create should return 401.', async () => {
                    const response = await app.request(
                        '/api/objectStorage/download/link/create',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                uploadId: 'a1b2c3d4e5f6g7h8',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(401)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.code).toBe('UNAUTHORIZED')
                })

                it('Unauthenticated request to /download/readMany should return 401.', async () => {
                    const response = await app.request(
                        '/api/objectStorage/download/readMany',
                        {
                            method: 'GET',
                            headers: {
                                origin: env.URL_FRONTEND,
                            },
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(401)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.code).toBe('UNAUTHORIZED')
                })

                it('Unauthenticated request to /upload/commit should return 401.', async () => {
                    const response = await app.request(
                        '/api/objectStorage/upload/commit',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                uploadId: 'a1b2c3d4e5f6g7h8',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(401)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.code).toBe('UNAUTHORIZED')
                })

                it('Unauthenticated request to /upload/attachment/create should return 401.', async () => {
                    const response = await app.request(
                        '/api/objectStorage/upload/attachment/create',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                uploadId: 'a1b2c3d4e5f6g7h8',
                                attachments: [],
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(401)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.code).toBe('UNAUTHORIZED')
                })

                it('Unauthenticated request to /upload/attachment/retry should return 401.', async () => {
                    const response = await app.request(
                        '/api/objectStorage/upload/attachment/retry',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                uploadId: 'a1b2c3d4e5f6g7h8',
                                attachments: [],
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(401)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.code).toBe('UNAUTHORIZED')
                })

                it('Unauthenticated request to /upload/attachment/commit should return 401.', async () => {
                    const response = await app.request(
                        '/api/objectStorage/upload/attachment/commit',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                            },
                            body: JSON.stringify({
                                uploadId: 'a1b2c3d4e5f6g7h8',
                                attachments: [],
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(401)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.code).toBe('UNAUTHORIZED')
                })
            })

            /**
             * @description
             * Basic Validation (Independent)
             */
            describe.concurrent('Basic Validation', () => {
                it('Should reject attachment with invalid upload ID.', async () => {
                    const response = await app.request(
                        '/api/objectStorage/upload/attachment/create',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
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

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(404)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.message).toBe(
                        'Upload ID not found or is already committed.',
                    )
                })

                it('Should reject commit for non-existent upload ID.', async () => {
                    const response = await app.request(
                        '/api/objectStorage/upload/attachment/commit',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
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

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(404)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.message).toBe(
                        'Upload ID not found or is already committed.',
                    )
                })

                it('Should fail with non-existent upload ID (Download Link).', async () => {
                    const response = await app.request(
                        '/api/objectStorage/download/link/create',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                                cookie: privilegedCookie,
                            },
                            body: JSON.stringify({
                                uploadId: 'nonexistent1234ab',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(404)
                    expect(responseData).toHaveProperty('error')
                    expect(responseData.error.message).toBe(
                        'Upload ID not found.',
                    )
                })

                it('Should reject invalid upload ID format (Download Link).', async () => {
                    const response = await app.request(
                        '/api/objectStorage/download/link/create',
                        {
                            method: 'POST',
                            headers: {
                                origin: env.URL_FRONTEND,
                                'content-type': 'application/json',
                                cookie: privilegedCookie,
                            },
                            body: JSON.stringify({
                                uploadId: 'short',
                            }),
                        },
                        env,
                    )

                    const responseData =
                        await response.json<TApiResponseError>()

                    expect(response.status).toBe(400)
                    expect(responseData).toHaveProperty('error')
                })
            })
        })
    })

export const registerSequentialObjectStorageTests = () =>
    describe('Object Storage Endpoint', () => {
        describe('Sequential Tests', () => {
            /**
             * @description
             * Upload Flow
             */
            describe('Upload Flow', () => {
                describe('Create Upload', () => {
                    it('Should reject upload creation without an idempotency key.', async () => {
                        const response = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({}),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(400)
                        expect(responseData.error.code).toBe('DATA_VALIDATION')
                    })

                    it('Should reject upload creation with a non-v7 idempotency key.', async () => {
                        const response = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: crypto.randomUUID(),
                                }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(400)
                        expect(responseData.error.code).toBe('DATA_VALIDATION')
                    })

                    it('Privileged user should be able to create an upload.', async () => {
                        const response = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()

                        expect(response.status).toBe(200)
                        expect(responseData.success).toBe(true)
                        expect(responseData.data.uploadId).toBeDefined()
                        expect(responseData.data.uploadId).toHaveLength(16)
                    })

                    it('Standard user should be able to create an upload.', async () => {
                        const response = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()

                        expect(response.status).toBe(200)
                        expect(responseData.success).toBe(true)
                        expect(responseData.data.uploadId).toBeDefined()
                        expect(responseData.data.uploadId).toHaveLength(16)
                    })

                    it('Should return the same upload for a repeated idempotency key.', async () => {
                        const idempotencyKey = uuidv7()

                        const responses = await Promise.all([
                            app.request(
                                '/api/objectStorage/upload/create',
                                {
                                    method: 'POST',
                                    headers: {
                                        origin: env.URL_FRONTEND,
                                        'content-type': 'application/json',
                                        cookie: privilegedCookie,
                                    },
                                    body: JSON.stringify({ idempotencyKey }),
                                },
                                env,
                            ),
                            app.request(
                                '/api/objectStorage/upload/create',
                                {
                                    method: 'POST',
                                    headers: {
                                        origin: env.URL_FRONTEND,
                                        'content-type': 'application/json',
                                        cookie: privilegedCookie,
                                    },
                                    body: JSON.stringify({ idempotencyKey }),
                                },
                                env,
                            ),
                        ])

                        const responseData = await Promise.all(
                            responses.map((response) =>
                                response.json<
                                    TApiResponseOk<{ uploadId: string }>
                                >(),
                            ),
                        )

                        expect(responses.map(({ status }) => status)).toEqual([
                            200,
                            200,
                        ])
                        expect(responseData[0].data.uploadId).toBe(
                            responseData[1].data.uploadId,
                        )
                    })

                    it('Should reject idempotency key reuse by another user.', async () => {
                        const idempotencyKey = uuidv7()

                        const firstResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({ idempotencyKey }),
                            },
                            env,
                        )

                        expect(firstResponse.status).toBe(200)

                        const response = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({ idempotencyKey }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(409)
                        expect(responseData.error.code).toBe(
                            'IDEMPOTENCY_KEY_CONFLICT',
                        )
                    })
                })

                describe('Create Upload Attachment', () => {
                    it('Should create attachment with valid input and return signed URLs.', async () => {
                        // Step 1: Create an upload
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
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
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        {
                                            size: 1024,
                                            hashSha256: createHashSha256(),
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
                        expect(
                            responseData.data.signedUrls[0].signedUrl,
                        ).toBeTruthy()
                        expect(
                            responseData.data.signedUrls[0].encodedHash,
                        ).toBeTruthy()
                    })

                    it('Should converge concurrent attachment creates with the same hash.', async () => {
                        const uploadId = await createUpload()
                        const hashSha256 = createHashSha256()

                        const attachmentPayload = {
                            uploadId,
                            attachments: [
                                {
                                    size: 1024,
                                    hashSha256,
                                    isPublic: false,
                                },
                            ],
                        }

                        const responses = await Promise.all([
                            app.request(
                                '/api/objectStorage/upload/attachment/create',
                                {
                                    method: 'POST',
                                    headers: {
                                        origin: env.URL_FRONTEND,
                                        'content-type': 'application/json',
                                        cookie: privilegedCookie,
                                    },
                                    body: JSON.stringify(attachmentPayload),
                                },
                                env,
                            ),
                            app.request(
                                '/api/objectStorage/upload/attachment/create',
                                {
                                    method: 'POST',
                                    headers: {
                                        origin: env.URL_FRONTEND,
                                        'content-type': 'application/json',
                                        cookie: privilegedCookie,
                                    },
                                    body: JSON.stringify(attachmentPayload),
                                },
                                env,
                            ),
                        ])

                        const responseData = await Promise.all(
                            responses.map((response) =>
                                response.json<
                                    TApiResponseOk<{
                                        signedUrls: {
                                            id: string
                                            status: number
                                        }[]
                                    }>
                                >(),
                            ),
                        )

                        expect(responses.map(({ status }) => status)).toEqual([
                            200,
                            200,
                        ])
                        expect(responseData[0].data.signedUrls[0].id).toBe(
                            responseData[1].data.signedUrls[0].id,
                        )
                        expect(
                            responseData.map(
                                ({ data }) => data.signedUrls[0].status,
                            ),
                        ).toEqual([
                            201,
                            201,
                        ])
                    })

                    it('Should reject attachment with empty attachments array.', async () => {
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()

                        const response = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(400)
                        expect(responseData).toHaveProperty('error')
                    })

                    it('Should reject attachment with invalid SHA-256 hash.', async () => {
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()

                        const response = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(400)
                        expect(responseData).toHaveProperty('error')
                    })

                    it('Should reject attachment with duplicate SHA-256 hashes.', async () => {
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()

                        const duplicateHash = 'c'.repeat(64)

                        const response = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(400)
                        expect(responseData).toHaveProperty('error')
                    })

                    it("Standard user should not access another user's upload.", async () => {
                        // Create upload as privileged user
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()

                        // Attempt to attach as standard user
                        const response = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({
                                    uploadId: uploadData.data.uploadId,
                                    attachments: [
                                        {
                                            size: 1024,
                                            hashSha256: createHashSha256(),
                                            isPublic: false,
                                        },
                                    ],
                                }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(404)
                        expect(responseData).toHaveProperty('error')
                        expect(responseData.error.message).toBe(
                            'Upload ID not found or is already committed.',
                        )
                    })

                    it('Should return 409 for already uploaded (deduplicated) attachment.', async () => {
                        // Step 1: Create first upload and add attachment
                        const upload1Response = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const upload1Data =
                            await upload1Response.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()
                        const uploadId1 = upload1Data.data.uploadId

                        const sharedHash = createHashSha256()

                        const attach1Response = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const upload2Data =
                            await upload2Response.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()

                        const response = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                        expect(
                            responseData.data.signedUrls[0].signedUrl,
                        ).toBeNull()
                    })

                    it('Should create a public object for the same hash as an existing private object.', async () => {
                        const sharedHash = createHashSha256()
                        const privateUploadId = await createUpload()

                        const privateAttachResponse = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId: privateUploadId,
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

                        const privateAttachData =
                            await privateAttachResponse.json<
                                TApiResponseOk<{
                                    signedUrls: { id: string; status: number }[]
                                }>
                            >()
                        const privateObjectId =
                            privateAttachData.data.signedUrls[0].id

                        expect(privateAttachResponse.status).toBe(200)
                        expect(
                            (
                                await commitUploadAttachment(
                                    privateUploadId,
                                    privateObjectId,
                                )
                            ).status,
                        ).toBe(200)

                        const publicUploadId = await createUpload()
                        const publicAttachResponse = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId: publicUploadId,
                                    attachments: [
                                        {
                                            size: 1024,
                                            hashSha256: sharedHash,
                                            isPublic: true,
                                        },
                                    ],
                                }),
                            },
                            env,
                        )

                        const publicAttachData =
                            await publicAttachResponse.json<
                                TApiResponseOk<{
                                    signedUrls: {
                                        id: string
                                        signedUrl: string | null
                                        status: number
                                    }[]
                                }>
                            >()

                        expect(publicAttachResponse.status).toBe(200)
                        expect(publicAttachData.data.signedUrls[0].status).toBe(
                            201,
                        )
                        expect(publicAttachData.data.signedUrls[0].id).not.toBe(
                            privateObjectId,
                        )
                        expect(
                            publicAttachData.data.signedUrls[0].signedUrl,
                        ).toContain(`/${env.CF_R2_BUCKET_PUBLIC}/`)
                    })
                })

                describe('Retry Upload Attachment', () => {
                    it('Should regenerate signed URLs for non-uploaded attachments.', async () => {
                        // Create upload and attachment
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()
                        const uploadId = uploadData.data.uploadId

                        const attachResponse = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        {
                                            size: 512,
                                            hashSha256: createHashSha256(),
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
                            '/api/objectStorage/upload/attachment/retry',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                        expect(
                            responseData.data.signedUrls[0].signedUrl,
                        ).toBeTruthy()
                    })

                    it('Should return 404 for non-existent attachment IDs.', async () => {
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()

                        const response = await app.request(
                            '/api/objectStorage/upload/attachment/retry',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                        expect(
                            responseData.data.signedUrls[0].signedUrl,
                        ).toBeNull()
                    })

                    it('Should return 409 for already uploaded attachments.', async () => {
                        // Create upload, attach, and commit
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()
                        const uploadId = uploadData.data.uploadId

                        const attachResponse = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        {
                                            size: 256,
                                            hashSha256: createHashSha256(),
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
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/upload/attachment/retry',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                        expect(
                            responseData.data.signedUrls[0].signedUrl,
                        ).toBeNull()
                    })

                    it('Should reject attachment retry after upload commit.', async () => {
                        const uploadId = await createUpload()
                        const attachmentId =
                            await createUploadAttachment(uploadId)

                        expect((await commitUpload(uploadId)).status).toBe(200)

                        const response = await app.request(
                            '/api/objectStorage/upload/attachment/retry',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(404)
                        expect(responseData.error.code).toBe('NOT_FOUND')
                    })
                })

                describe('Commit Upload Attachment', () => {
                    it('Should mark attachments as uploaded.', async () => {
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()
                        const uploadId = uploadData.data.uploadId

                        const attachResponse = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        {
                                            size: 2048,
                                            hashSha256: createHashSha256(),
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
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                        expect(responseData.data.attachments).toContain(
                            attachmentId,
                        )
                    })

                    it('Should reject repeated attachment commit.', async () => {
                        const uploadId = await createUpload()
                        const attachmentId =
                            await createUploadAttachment(uploadId)

                        expect(
                            (
                                await commitUploadAttachment(
                                    uploadId,
                                    attachmentId,
                                )
                            ).status,
                        ).toBe(200)

                        const response = await commitUploadAttachment(
                            uploadId,
                            attachmentId,
                        )
                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(409)
                        expect(responseData.error.code).toBe(
                            'UPLOAD_ATTACHMENTS_ALREADY_COMMITTED',
                        )
                    })

                    it('Should allow only one concurrent attachment commit.', async () => {
                        const uploadId = await createUpload()
                        const attachmentId =
                            await createUploadAttachment(uploadId)

                        const responses = await Promise.all([
                            commitUploadAttachment(uploadId, attachmentId),
                            commitUploadAttachment(uploadId, attachmentId),
                        ])

                        expect(
                            responses.map(({ status }) => status).sort(),
                        ).toEqual([
                            200,
                            409,
                        ])
                    })

                    it('Should reject partial attachment commit with unknown IDs.', async () => {
                        const uploadId = await createUpload()
                        const attachmentId =
                            await createUploadAttachment(uploadId)

                        const response = await app.request(
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        attachmentId,
                                        'a'.repeat(32),
                                    ],
                                }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(404)
                        expect(responseData.error.code).toBe(
                            'UPLOAD_ATTACHMENTS_NOT_FOUND',
                        )
                        expect(
                            (
                                await commitUploadAttachment(
                                    uploadId,
                                    attachmentId,
                                )
                            ).status,
                        ).toBe(200)
                    })

                    it('Should reject partial attachment commit with already committed IDs.', async () => {
                        const uploadId = await createUpload()
                        const committedAttachmentId =
                            await createUploadAttachment(uploadId)
                        const pendingAttachmentId =
                            await createUploadAttachment(uploadId)

                        expect(
                            (
                                await commitUploadAttachment(
                                    uploadId,
                                    committedAttachmentId,
                                )
                            ).status,
                        ).toBe(200)

                        const response = await app.request(
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        committedAttachmentId,
                                        pendingAttachmentId,
                                    ],
                                }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(409)
                        expect(responseData.error.code).toBe(
                            'UPLOAD_ATTACHMENTS_ALREADY_COMMITTED',
                        )
                        expect(
                            (
                                await commitUploadAttachment(
                                    uploadId,
                                    pendingAttachmentId,
                                )
                            ).status,
                        ).toBe(200)
                    })

                    it('Should reject attachment commit after upload commit.', async () => {
                        const uploadId = await createUpload()
                        const attachmentId =
                            await createUploadAttachment(uploadId)

                        expect((await commitUpload(uploadId)).status).toBe(200)

                        const response = await commitUploadAttachment(
                            uploadId,
                            attachmentId,
                        )
                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(409)
                        expect(responseData.error.code).toBe(
                            'UPLOAD_ALREADY_COMMITTED',
                        )
                    })
                })

                describe('Commit Upload', () => {
                    it('Should commit an upload with attachments.', async () => {
                        // Full flow: create → attach → attachment commit → upload commit
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()
                        const uploadId = uploadData.data.uploadId

                        const attachResponse = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        {
                                            size: 4096,
                                            hashSha256: createHashSha256(),
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
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                        expect(responseData.data.attachments).toContain(
                            attachmentId,
                        )
                    })

                    it('Should allow commit for an empty upload.', async () => {
                        const uploadId = await createUpload()

                        const response = await app.request(
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({ uploadId }),
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
                        expect(responseData.data.uploadId).toBe(uploadId)
                        expect(responseData.data.attachments).toEqual([])
                    })

                    it('Should reject upload commit with pending selected attachments.', async () => {
                        const uploadId = await createUpload()
                        const attachmentId =
                            await createUploadAttachment(uploadId)

                        const response = await app.request(
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(409)
                        expect(responseData.error.code).toBe(
                            'UPLOAD_ATTACHMENTS_NOT_COMMITTED',
                        )
                    })

                    it('Should reject upload commit with unknown selected attachments.', async () => {
                        const uploadId = await createUpload()

                        const response = await app.request(
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: ['a'.repeat(32)],
                                }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(404)
                        expect(responseData.error.code).toBe(
                            'UPLOAD_ATTACHMENTS_NOT_FOUND',
                        )
                    })

                    it('Should reject commit for already committed upload.', async () => {
                        // Create and commit an upload first
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
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
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({ uploadId }),
                            },
                            env,
                        )

                        // Try to commit again
                        const response = await app.request(
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({ uploadId }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(409)
                        expect(responseData).toHaveProperty('error')
                        expect(responseData.error.code).toBe(
                            'UPLOAD_ALREADY_COMMITTED',
                        )
                    })

                    it('Should allow only one concurrent upload commit.', async () => {
                        const uploadId = await createUpload()

                        const responses = await Promise.all([
                            commitUpload(uploadId),
                            commitUpload(uploadId),
                        ])

                        expect(
                            responses.map(({ status }) => status).sort(),
                        ).toEqual([
                            200,
                            409,
                        ])
                    })

                    it('Should purge unselected attachments on commit.', async () => {
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
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
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        {
                                            size: 1024,
                                            hashSha256: createHashSha256(),
                                            isPublic: false,
                                        },
                                        {
                                            size: 2048,
                                            hashSha256: createHashSha256(),
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
                        const keepAttachmentId =
                            attachData.data.signedUrls[0].id

                        await app.request(
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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

                        // Commit with only the first attachment (purge the second)
                        const response = await app.request(
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()

                        // Attempt commit as standard user
                        const response = await app.request(
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({
                                    uploadId: uploadData.data.uploadId,
                                }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

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
                describe('Read Download List', () => {
                    it('Should list committed uploaded objects and skip pending objects.', async () => {
                        const committedUploadId =
                            await createUpload(standardCookie)
                        const committedAttachmentId =
                            await createUploadAttachment(
                                committedUploadId,
                                standardCookie,
                            )

                        expect(
                            (
                                await commitUploadAttachment(
                                    committedUploadId,
                                    committedAttachmentId,
                                )
                            ).status,
                        ).toBe(200)
                        expect(
                            (
                                await commitUpload(committedUploadId, [
                                    committedAttachmentId,
                                ])
                            ).status,
                        ).toBe(200)

                        const pendingUploadId =
                            await createUpload(standardCookie)
                        const pendingAttachmentId =
                            await createUploadAttachment(
                                pendingUploadId,
                                standardCookie,
                            )

                        const response = await app.request(
                            '/api/objectStorage/download/readMany?limit=100&offset=0&sortOrder=desc',
                            {
                                method: 'GET',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    cookie: standardCookie,
                                },
                            },
                            env,
                        )

                        const responseData = await response.json<
                            TApiResponsePaginatedOk<
                                {
                                    uploadId: string
                                    objectStorageId: string
                                }[]
                            >
                        >()

                        expect(response.status).toBe(200)
                        expect(responseData.success).toBe(true)
                        expect(
                            responseData.data.some(
                                ({ objectStorageId, uploadId }) =>
                                    uploadId === committedUploadId &&
                                    objectStorageId === committedAttachmentId,
                            ),
                        ).toBe(true)
                        expect(
                            responseData.data.some(
                                ({ objectStorageId, uploadId }) =>
                                    uploadId === pendingUploadId &&
                                    objectStorageId === pendingAttachmentId,
                            ),
                        ).toBe(false)
                    })
                })

                describe('Create Download Link', () => {
                    it('Should reject download links before upload commit.', async () => {
                        const uploadId = await createUpload(standardCookie)
                        const attachmentId = await createUploadAttachment(
                            uploadId,
                            standardCookie,
                        )

                        await app.request(
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/download/link/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({ uploadId }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(404)
                        expect(responseData.error.message).toBe(
                            'Upload ID not found.',
                        )
                    })

                    it('Should reject download links for pending attachments.', async () => {
                        const uploadId = await createUpload(standardCookie)
                        await createUploadAttachment(uploadId, standardCookie)

                        const response = await app.request(
                            '/api/objectStorage/download/link/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({ uploadId }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(404)
                        expect(responseData.error.message).toBe(
                            'Upload ID not found.',
                        )
                    })

                    it('Should create download links for own upload.', async () => {
                        // Full upload flow first
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()
                        const uploadId = uploadData.data.uploadId

                        const attachResponse = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        {
                                            size: 1024,
                                            hashSha256: createHashSha256(),
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
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/download/link/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()
                        const uploadId = uploadData.data.uploadId

                        const attachResponse = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        {
                                            size: 1024,
                                            hashSha256: createHashSha256(),
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
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/download/link/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({ uploadId }),
                            },
                            env,
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(404)
                        expect(responseData).toHaveProperty('error')
                        expect(responseData.error.message).toBe(
                            'Upload ID not found.',
                        )
                    })

                    it("Privileged user should access any user's upload download links.", async () => {
                        // Create upload as standard user
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()
                        const uploadId = uploadData.data.uploadId

                        const attachResponse = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        {
                                            size: 1024,
                                            hashSha256: createHashSha256(),
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
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/download/link/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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

                    it('Should return public URL for public objects.', async () => {
                        const uploadResponse = await app.request(
                            '/api/objectStorage/upload/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({
                                    idempotencyKey: uuidv7(),
                                }),
                            },
                            env,
                        )

                        const uploadData =
                            await uploadResponse.json<
                                TApiResponseOk<{ uploadId: string }>
                            >()
                        const uploadId = uploadData.data.uploadId

                        const attachResponse = await app.request(
                            '/api/objectStorage/upload/attachment/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: standardCookie,
                                },
                                body: JSON.stringify({
                                    uploadId,
                                    attachments: [
                                        {
                                            size: 1024,
                                            hashSha256: createHashSha256(),
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
                            '/api/objectStorage/upload/attachment/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/upload/commit',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                            '/api/objectStorage/download/link/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
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
                        expect(responseData.data.downloadUrls[0].status).toBe(
                            201,
                        )
                        expect(
                            responseData.data.downloadUrls[0].downloadUrl,
                        ).toBeTruthy()
                        // Public objects use the public bucket URL (not a signed URL)
                        expect(
                            responseData.data.downloadUrls[0].downloadUrl,
                        ).not.toContain('X-Amz')
                    })

                    it('Should reject public object downloads when public URL config is blank.', async () => {
                        const uploadId = await createUpload()
                        const attachmentId = await createUploadAttachment(
                            uploadId,
                            privilegedCookie,
                            true,
                        )

                        expect(
                            (
                                await commitUploadAttachment(
                                    uploadId,
                                    attachmentId,
                                )
                            ).status,
                        ).toBe(200)
                        expect(
                            (await commitUpload(uploadId, [attachmentId]))
                                .status,
                        ).toBe(200)

                        const response = await app.request(
                            '/api/objectStorage/download/link/create',
                            {
                                method: 'POST',
                                headers: {
                                    origin: env.URL_FRONTEND,
                                    'content-type': 'application/json',
                                    cookie: privilegedCookie,
                                },
                                body: JSON.stringify({ uploadId }),
                            },
                            {
                                ...env,
                                CF_R2_BUCKET_PUBLIC_URL: '',
                            },
                        )

                        const responseData =
                            await response.json<TApiResponseError>()

                        expect(response.status).toBe(500)
                        expect(responseData.error.code).toBe(
                            'PUBLIC_R2_URL_NOT_CONFIGURED',
                        )
                    })
                })
            })
        })
    })
