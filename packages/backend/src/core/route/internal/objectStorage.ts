import {
    objectStorageCreateDownloadLinkInputSchema,
    objectStorageCreateUploadLinkInputSchema,
    objectStorageUploadAttachmentAddInputSchema,
} from '@hyperion/validator/internal/objectStorage'
import { hexToBytes } from '@noble/hashes/utils.js'
import { eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { encodeBase64 } from 'hono/utils/encode'
import { validator } from 'hono/validator'

import { AppError } from '../../../errors.js'
import { honoValidatorCb, nanoidCustom } from '../../../utilities.js'
import { isAuthenticated } from '../../middleware/isAuthenticated.js'

export const objectStorageRoute = new Hono<THonoInstance>()

// Routes
objectStorageRoute.post(
    '/create/downloadLink',
    isAuthenticated(),
    validator('json', async (value, ctx) =>
        honoValidatorCb(value, ctx, objectStorageCreateDownloadLinkInputSchema),
    ),
    async (ctx) => {
        const keys = ctx.req.valid('json')

        const { objectStorage, objectStorageAcl, upload, uploadAttachment } =
            ctx.get('dbSchema')

        const providedKeys = keys.map(({ key }) => key)

        const objectData = await ctx
            .get('dbClient')
            .select({
                objectStorage,
                objectStorageAcl,
                uploadAttachment,
                upload,
            })
            .from(objectStorage)
            .innerJoin(
                objectStorageAcl,
                eq(objectStorageAcl.objectStorageId, objectStorage.id),
            )
            .innerJoin(
                uploadAttachment,
                eq(uploadAttachment.objectStorageId, objectStorage.id),
            )
            .innerJoin(upload, eq(upload.id, uploadAttachment.uploadId))
            .where(inArray(upload.id, providedKeys))

        const signedUrls: {
            key: string
            signedUrl: string | null
            status: 200 | 403 | 404
        }[] = []

        // Non-existent Keys
        for (const key of providedKeys) {
            const isObjectFound = objectData
                .map(({ upload }) => upload.id)
                .includes(key)

            if (!isObjectFound) {
                signedUrls.push({
                    key: key,
                    signedUrl: null,
                    status: 404,
                })
            }
        }

        // Existent Keys
        for (const obj of objectData) {
            const isPublicObject = obj.objectStorage.isPublic

            const hasObjectPermission =
                obj.objectStorageAcl.userId === ctx.get('user')!.id &&
                Boolean(obj.objectStorageAcl.mode & 1)

            if (
                ctx.get('isPrivilegedRole') ||
                isPublicObject ||
                hasObjectPermission
            ) {
                signedUrls.push({
                    key: obj.objectStorage.id,
                    signedUrl: (
                        await ctx
                            .get('aws4FetchClient')
                            .sign(
                                `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${ctx.env.CF_R2_BUCKET}/${obj.objectStorage.id}?X-Amz-Expires=${300}`,
                                {
                                    method: 'GET',
                                    aws: {
                                        service: 's3',
                                        signQuery: true,
                                    },
                                },
                            )
                    ).url,
                    status: 200,
                })
            } else {
                signedUrls.push({
                    key: obj.objectStorage.id,
                    signedUrl: null,
                    status: 403,
                })
            }
        }

        return ctx.json({ data: signedUrls }, 200)
    },
)

objectStorageRoute.get('/upload/id/create', isAuthenticated(), async (ctx) => {
    const { upload } = ctx.get('dbSchema')

    try {
        const uploadId = nanoidCustom(16)

        await ctx
            .get('dbClient')
            .insert(upload)
            .values({
                id: uploadId,
                userId: ctx.get('user')!.id,
            })

        return ctx.json(
            {
                data: { uploadId },
            },
            200,
        )
    } catch (err) {
        throw new AppError(
            {
                status: 500,
                code: 'UPLOAD_ID_CREATION_FAILED',
                message: 'Upload ID creation failed.',
            },
            err instanceof Error ? err : undefined,
        )
    }
})

objectStorageRoute.post(
    '/upload/attachment/add',
    isAuthenticated(),
    validator('json', async (value, ctx) =>
        honoValidatorCb(
            value,
            ctx,
            objectStorageUploadAttachmentAddInputSchema,
        ),
    ),
    async (ctx) => {
        const { attachments, uploadId } = ctx.req.valid('json')

        const { objectStorage, objectStorageAcl, upload, uploadAttachment } =
            ctx.get('dbSchema')

        const objectStorageData: Pick<
            typeof objectStorage.$inferInsert,
            'id' | 'size' | 'mimeType' | 'hashSha256' | 'isPublic'
        >[] = []

        const objectStorageAclData: Pick<
            typeof objectStorageAcl.$inferInsert,
            'userId' | 'objectStorageId'
        >[] = []

        const uploadAttachmentData: Pick<
            typeof uploadAttachment.$inferInsert,
            'uploadId' | 'objectStorageId'
        >[] = []

        // Check if provided uploadId is valid
        const uploadData = await ctx
            .get('dbClient')
            .select({ id: upload.id })
            .from(upload)
            .where(eq(upload.id, uploadId))

        if (!uploadData[0]) {
            return ctx.json(
                {
                    error: {
                        code: 'BAD_REQUEST',
                        message: 'Upload ID not found.',
                    },
                },
                400,
            )
        }

        const signedUrls: {
            objectStorageId: string
            hash: string
            encodedHash: string | null
            signedUrl: string | null
            status: 200 | 409
        }[] = []

        // Existing SHA-256 hash check
        const hashesToCheck = attachments.map(({ hashSha256 }) => hashSha256)

        const existingObjects = await ctx
            .get('dbClient')
            .select({
                id: objectStorage.id,
                hashSha256: objectStorage.hashSha256,
            })
            .from(objectStorage)
            .where(inArray(objectStorage.hashSha256, hashesToCheck))

        const existingHashes = existingObjects.map(
            ({ hashSha256 }) => hashSha256,
        )

        // Generate pre-signed upload URLs
        for (const attachment of attachments) {
            if (existingHashes.includes(attachment.hashSha256)) {
                const objectStorageId = existingObjects.filter(
                    ({ hashSha256 }) => hashSha256 === attachment.hashSha256,
                )[0].id

                uploadAttachmentData.push({ uploadId, objectStorageId })

                objectStorageAclData.push({
                    userId: ctx.get('user')!.id,
                    objectStorageId,
                })

                signedUrls.push({
                    objectStorageId,
                    hash: attachment.hashSha256,
                    encodedHash: null,
                    signedUrl: null,
                    status: 409,
                })
            } else {
                // Encode SHA-256 hash to Base64
                const hashBase64 = encodeBase64(
                    hexToBytes(attachment.hashSha256).buffer,
                )

                objectStorageData.push({
                    ...attachment,
                    size: Number(attachment.size),
                })

                uploadAttachmentData.push({
                    uploadId,
                    objectStorageId: attachment.id,
                })

                objectStorageAclData.push({
                    userId: ctx.get('user')!.id,
                    objectStorageId: attachment.id,
                })

                signedUrls.push({
                    objectStorageId: attachment.id,
                    hash: attachment.hashSha256,
                    encodedHash: hashBase64,
                    signedUrl: (
                        await ctx
                            .get('aws4FetchClient')
                            .sign(
                                `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${ctx.env.CF_R2_BUCKET}/${attachment.id}?X-Amz-Expires=${300}`,
                                {
                                    method: 'PUT',
                                    headers: {
                                        // https://developers.cloudflare.com/r2/api/s3/api/#checksum-types
                                        'x-amz-checksum-sha256': hashBase64,
                                    },
                                    aws: {
                                        service: 's3',
                                        signQuery: true,
                                    },
                                },
                            )
                    ).url,
                    status: 200,
                })
            }
        }

        try {
            await ctx.get('dbClient').transaction(async (tx) => {
                if (objectStorageData.length > 0) {
                    // Must throw an error if there is a duplicate Object ID
                    await tx.insert(objectStorage).values(objectStorageData)
                }

                await tx
                    .insert(objectStorageAcl)
                    .values(objectStorageAclData)
                    .onConflictDoNothing()

                await tx
                    .insert(uploadAttachment)
                    .values(uploadAttachmentData)
                    .onConflictDoNothing()
            })

            return ctx.json(
                {
                    data: { uploadId, signedUrls },
                },
                200,
            )
        } catch (err) {
            throw new AppError(
                {
                    status: 500,
                    code: 'UPLOAD_ATTACHMENT_ADDITION_FAILED',
                    message: 'Upload attachment addition failed.',
                },
                err instanceof Error ? err : undefined,
            )
        }
    },
)

objectStorageRoute.post(
    '/create/uploadLink',
    isAuthenticated(),
    validator('json', async (value, ctx) =>
        honoValidatorCb(value, ctx, objectStorageCreateUploadLinkInputSchema),
    ),
    async (ctx) => {
        const objectData = ctx.req.valid('json')

        const { objectStorage, objectStorageAcl, upload, uploadAttachment } =
            ctx.get('dbSchema')

        const objectStorageData: Pick<
            typeof objectStorage.$inferInsert,
            'id' | 'size' | 'mimeType' | 'hashSha256' | 'isPublic'
        >[] = []

        const uploadAttachmentData: Pick<
            typeof uploadAttachment.$inferInsert,
            'uploadId' | 'objectStorageId'
        >[] = []

        const objectStorageAclData: Pick<
            typeof objectStorageAcl.$inferInsert,
            'userId' | 'objectStorageId'
        >[] = []

        const signedUrls: {
            key: string
            hash: string
            encodedHash: string | null
            signedUrl: string | null
            status: 200 | 409
        }[] = []

        // Existing SHA-256 hash detection
        const hashesToCheck = objectData.map(({ hashSha256 }) => hashSha256)

        const existingObjects = await ctx
            .get('dbClient')
            .select({
                id: objectStorage.id,
                hashSha256: objectStorage.hashSha256,
            })
            .from(objectStorage)
            .where(inArray(objectStorage.hashSha256, hashesToCheck))

        const existingHashes = existingObjects.map(
            ({ hashSha256 }) => hashSha256,
        )

        // Generate an Upload ID for this batch
        const uploadId = nanoidCustom(16)

        // Generate pre-signed upload URLs
        for (const obj of objectData) {
            if (existingHashes.includes(obj.hashSha256)) {
                const objectStorageId = existingObjects.filter(
                    ({ hashSha256 }) => hashSha256 === obj.hashSha256,
                )[0].id

                signedUrls.push({
                    key: objectStorageId,
                    hash: obj.hashSha256,
                    encodedHash: null,
                    signedUrl: null,
                    status: 409,
                })

                uploadAttachmentData.push({ uploadId, objectStorageId })

                objectStorageAclData.push({
                    userId: ctx.get('user')!.id,
                    objectStorageId,
                })
            } else {
                const objectStorageId = nanoidCustom(32)

                // Convert hex-encoded hash to bytes
                const hashBytes = new Uint8Array(
                    obj.hashSha256.match(/.{2}/g)!.map((b) => parseInt(b, 16)),
                )

                // Convert bytes to binary representation
                const hashBinaryString = String.fromCharCode(...hashBytes)

                // Encode to Base64
                const hashBase64 = btoa(hashBinaryString)

                objectStorageData.push({
                    ...obj,
                    id: objectStorageId,
                    size: Number(obj.size),
                })

                uploadAttachmentData.push({ uploadId, objectStorageId })

                objectStorageAclData.push({
                    userId: ctx.get('user')!.id,
                    objectStorageId,
                })

                signedUrls.push({
                    key: objectStorageId,
                    hash: obj.hashSha256,
                    encodedHash: hashBase64,
                    signedUrl: (
                        await ctx
                            .get('aws4FetchClient')
                            .sign(
                                `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${ctx.env.CF_R2_BUCKET}/${objectStorageId}?X-Amz-Expires=${300}`,
                                {
                                    method: 'PUT',
                                    headers: {
                                        // https://developers.cloudflare.com/r2/api/s3/api/#checksum-types
                                        'x-amz-checksum-sha256': hashBase64,
                                    },
                                    aws: {
                                        service: 's3',
                                        signQuery: true,
                                    },
                                },
                            )
                    ).url,
                    status: 200,
                })
            }
        }

        // Save object metadata to DB
        if (
            uploadAttachmentData.length > 0 ||
            objectStorageAclData.length > 0
        ) {
            await ctx.get('dbClient').transaction(async (tx) => {
                await tx.insert(upload).values({
                    id: uploadId,
                    userId: ctx.get('user')!.id,
                })

                if (objectStorageData.length > 0) {
                    await tx.insert(objectStorage).values(objectStorageData)
                }

                await tx.insert(uploadAttachment).values(uploadAttachmentData)

                await tx
                    .insert(objectStorageAcl)
                    .values(objectStorageAclData)
                    .onConflictDoNothing() // Handles the case when the same user uploads the same file.
            })
        }

        return ctx.json(
            {
                data: {
                    uploadId,
                    signedUrls,
                },
            },
            200,
        )
    },
)

export default objectStorageRoute
