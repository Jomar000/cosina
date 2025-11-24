import {
    objectStorageCreateUploadLinkInputSchema,
    objectStorageDownloadLinkCreateInputSchema,
    objectStorageUploadAttachmentCommitInputSchema,
    objectStorageUploadAttachmentCreateInputSchema,
    objectStorageUploadCommitInputSchema,
} from '@hyperion/validator/internal/objectStorage'
import { hexToBytes } from '@noble/hashes/utils.js'
import { and, eq, inArray, notInArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { encodeBase64 } from 'hono/utils/encode'
import { validator } from 'hono/validator'

import { AppError } from '../../../errors.js'
import { honoValidatorCb, nanoidCustom } from '../../../utilities.js'
import { isAuthenticated } from '../../middleware/isAuthenticated.js'

export const objectStorageRoute = new Hono<THonoInstance>()

// Routes
objectStorageRoute.post(
    '/download/link/create',
    isAuthenticated(),
    validator('json', async (value, ctx) =>
        honoValidatorCb(value, ctx, objectStorageDownloadLinkCreateInputSchema),
    ),
    async (ctx) => {
        const { uploadId } = ctx.req.valid('json')

        const { objectStorage, objectStorageAcl, upload, uploadAttachment } =
            ctx.get('dbSchema')

        const linkedObjects = await ctx
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
            .where(eq(upload.id, uploadId))

        if (linkedObjects.length === 0) {
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
            signedUrl: string | null
            status: 200 | 403
        }[] = []

        for (const { objectStorage, objectStorageAcl } of linkedObjects) {
            const isPublicObject = objectStorage.isPublic

            const hasObjectPermission =
                objectStorageAcl.userId === ctx.get('user')!.id &&
                Boolean(objectStorageAcl.mode & 1)

            if (
                ctx.get('isPrivilegedRole') ||
                isPublicObject ||
                hasObjectPermission
            ) {
                signedUrls.push({
                    objectStorageId: objectStorage.id,
                    signedUrl: (
                        await ctx
                            .get('aws4FetchClient')
                            .sign(
                                `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${ctx.env.CF_R2_BUCKET}/${objectStorage.id}?X-Amz-Expires=${300}`,
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
                    objectStorageId: objectStorage.id,
                    signedUrl: null,
                    status: 403,
                })
            }
        }

        return ctx.json({ data: signedUrls }, 200)
    },
)

objectStorageRoute.get('/upload/create', isAuthenticated(), async (ctx) => {
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
            201,
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
    '/upload/commit',
    isAuthenticated(),
    validator('json', async (value, ctx) =>
        honoValidatorCb(value, ctx, objectStorageUploadCommitInputSchema),
    ),
    async (ctx) => {
        const { attachments, uploadId } = ctx.req.valid('json')

        const { objectStorage, upload, uploadAttachment } = ctx.get('dbSchema')

        const uploadData = await ctx
            .get('dbClient')
            .select({ id: upload.id })
            .from(upload)
            .where(and(eq(upload.id, uploadId), eq(upload.isCommitted, false)))

        if (!uploadData[0]) {
            return ctx.json(
                {
                    error: {
                        code: 'BAD_REQUEST',
                        message: 'Upload ID not found or is already committed.',
                    },
                },
                400,
            )
        }

        const attachmentsToPurge = (
            await ctx
                .get('dbClient')
                .select({ id: objectStorage.id })
                .from(upload)
                .innerJoin(
                    uploadAttachment,
                    eq(upload.id, uploadAttachment.uploadId),
                )
                .innerJoin(
                    objectStorage,
                    eq(objectStorage.id, uploadAttachment.objectStorageId),
                )
                .where(
                    and(
                        eq(upload.id, uploadId),
                        eq(upload.isCommitted, false),
                        notInArray(objectStorage.id, attachments),
                    ),
                )
        ).map(({ id }) => id)

        const committedAttachments = await ctx
            .get('dbClient')
            .transaction(async (tx) => {
                await tx
                    .delete(uploadAttachment)
                    .where(
                        and(
                            eq(uploadAttachment.uploadId, uploadId),
                            inArray(
                                uploadAttachment.objectStorageId,
                                attachmentsToPurge,
                            ),
                        ),
                    )

                await tx
                    .update(upload)
                    .set({ isCommitted: true })
                    .where(eq(upload.id, uploadId))

                return await tx
                    .select({ id: objectStorage.id })
                    .from(upload)
                    .innerJoin(
                        uploadAttachment,
                        eq(upload.id, uploadAttachment.uploadId),
                    )
                    .innerJoin(
                        objectStorage,
                        eq(objectStorage.id, uploadAttachment.objectStorageId),
                    )
                    .where(eq(upload.id, uploadId))
            })

        return ctx.json(
            {
                data: {
                    uploadId,
                    attachments: committedAttachments.map(({ id }) => id),
                },
            },
            200,
        )
    },
)

objectStorageRoute.post(
    '/upload/attachment/create',
    isAuthenticated(),
    validator('json', async (value, ctx) =>
        honoValidatorCb(
            value,
            ctx,
            objectStorageUploadAttachmentCreateInputSchema,
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

        const uploadData = await ctx
            .get('dbClient')
            .select({ id: upload.id })
            .from(upload)
            .where(and(eq(upload.id, uploadId), eq(upload.isCommitted, false)))

        if (!uploadData[0]) {
            return ctx.json(
                {
                    error: {
                        code: 'BAD_REQUEST',
                        message: 'Upload ID not found or is already committed.',
                    },
                },
                400,
            )
        }

        const signedUrls: {
            id: string
            hashSha256: string
            encodedHash: string | null
            signedUrl: string | null
            status: 201 | 409
        }[] = []

        const hashesToCheck = attachments.map(({ hashSha256 }) => hashSha256)

        const existingObjects = await ctx
            .get('dbClient')
            .select({
                id: objectStorage.id,
                hashSha256: objectStorage.hashSha256,
            })
            .from(objectStorage)
            .where(inArray(objectStorage.hashSha256, hashesToCheck))

        const existingObjectsHash = existingObjects.map(
            ({ hashSha256 }) => hashSha256,
        )

        // Generate pre-signed upload URLs
        for (const attachment of attachments) {
            if (existingObjectsHash.includes(attachment.hashSha256)) {
                const objectStorageId = existingObjects.filter(
                    ({ hashSha256 }) => hashSha256 === attachment.hashSha256,
                )[0].id

                uploadAttachmentData.push({ uploadId, objectStorageId })

                objectStorageAclData.push({
                    userId: ctx.get('user')!.id,
                    objectStorageId,
                })

                signedUrls.push({
                    id: objectStorageId,
                    hashSha256: attachment.hashSha256,
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
                    id: attachment.id,
                    hashSha256: attachment.hashSha256,
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
                    status: 201,
                })
            }
        }

        try {
            await ctx.get('dbClient').transaction(async (tx) => {
                if (objectStorageData.length > 0) {
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
    '/upload/attachment/commit',
    isAuthenticated(),
    validator('json', async (value, ctx) =>
        honoValidatorCb(
            value,
            ctx,
            objectStorageUploadAttachmentCommitInputSchema,
        ),
    ),
    async (ctx) => {
        const { attachments, uploadId } = ctx.req.valid('json')

        const { objectStorage, upload, uploadAttachment } = ctx.get('dbSchema')

        const uploadData = await ctx
            .get('dbClient')
            .select({ id: upload.id })
            .from(upload)
            .where(and(eq(upload.id, uploadId), eq(upload.isCommitted, false)))

        if (!uploadData[0]) {
            return ctx.json(
                {
                    error: {
                        code: 'BAD_REQUEST',
                        message: 'Upload ID not found or is already committed.',
                    },
                },
                400,
            )
        }

        const attachmentsToCommit = (
            await ctx
                .get('dbClient')
                .select({ id: objectStorage.id })
                .from(upload)
                .innerJoin(
                    uploadAttachment,
                    eq(upload.id, uploadAttachment.uploadId),
                )
                .innerJoin(
                    objectStorage,
                    eq(objectStorage.id, uploadAttachment.objectStorageId),
                )
                .where(
                    and(
                        eq(upload.id, uploadId),
                        inArray(objectStorage.id, attachments),
                    ),
                )
        ).map(({ id }) => id)

        await ctx
            .get('dbClient')
            .update(objectStorage)
            .set({ isUploaded: true })
            .where(inArray(objectStorage.id, attachmentsToCommit))

        return ctx.json(
            {
                data: {
                    uploadId,
                    attachments: attachmentsToCommit,
                },
            },
            200,
        )
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
