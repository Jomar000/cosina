import {
    uploadAttachmentCommitInputSchema,
    uploadAttachmentCreateInputSchema,
    uploadAttachmentRetryInputSchema,
} from '@hyperion/validator/backoffice/objectStorage'
import { and, eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { encodeBase64 } from 'hono/utils/encode'
import { hexToBytes } from '@noble/hashes/utils.js'
import { validator } from 'hono/validator'

import { AppError } from '../../../../errors.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
    nanoidCustom,
    validatorCallback,
} from '../../../../utilities.js'

export const uploadAttachmentRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .post(
        '/create',
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, uploadAttachmentCreateInputSchema),
        ),
        async (ctx) => {
            const { attachments, uploadId } = ctx.req.valid('json')

            const {
                objectStorage,
                objectStorageAcl,
                upload,
                uploadAttachment,
            } = ctx.get('dbSchema')

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
                .where(
                    and(
                        eq(upload.id, uploadId),
                        eq(upload.isCommitted, false),
                        ctx.get('isPrivilegedRole')
                            ? undefined
                            : eq(upload.userId, ctx.get('user')!.id),
                    ),
                )

            if (!uploadData[0]) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'Upload ID not found or is already committed.',
                    status: 404,
                })
            }

            const signedUrls: {
                id: string
                hashSha256: string
                encodedHash: string | null
                signedUrl: string | null
                status: 201 | 409
            }[] = []

            const hashesToCheck = attachments.map(
                ({ hashSha256 }) => hashSha256,
            )

            const [
                uploadedObjects,
                nonUploadedObjects,
            ] = await Promise.all([
                ctx
                    .get('dbClient')
                    .select({
                        id: objectStorage.id,
                        hashSha256: objectStorage.hashSha256,
                    })
                    .from(objectStorage)
                    .where(
                        and(
                            eq(objectStorage.isUploaded, true),
                            inArray(objectStorage.hashSha256, hashesToCheck),
                        ),
                    ),
                ctx
                    .get('dbClient')
                    .select({
                        id: objectStorage.id,
                        hashSha256: objectStorage.hashSha256,
                    })
                    .from(objectStorage)
                    .where(
                        and(
                            eq(objectStorage.isUploaded, false),
                            inArray(objectStorage.hashSha256, hashesToCheck),
                        ),
                    ),
            ])

            const uploadedObjectsHash = uploadedObjects.map(
                ({ hashSha256 }) => hashSha256,
            )

            const nonUploadedObjectsHash = nonUploadedObjects.map(
                ({ hashSha256 }) => hashSha256,
            )

            // Prepare data and generate pre-signed upload URLs
            const signingPromises: Promise<void>[] = []

            for (const attachment of attachments) {
                if (uploadedObjectsHash.includes(attachment.hashSha256)) {
                    const objectStorageId = uploadedObjects.filter(
                        ({ hashSha256 }) =>
                            hashSha256 === attachment.hashSha256,
                    )[0].id

                    uploadAttachmentData.push({
                        uploadId,
                        objectStorageId,
                    })

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
                    let objectStorageId = nanoidCustom(32)

                    // Object is already present but not yet marked uploaded. Reuse existing object.
                    if (
                        nonUploadedObjectsHash.includes(attachment.hashSha256)
                    ) {
                        objectStorageId = nonUploadedObjects.filter(
                            ({ hashSha256 }) =>
                                hashSha256 === attachment.hashSha256,
                        )[0].id
                    } else {
                        objectStorageData.push({
                            id: objectStorageId,
                            ...attachment,
                            isPublic: attachment.isPublic,
                            size: Number(attachment.size),
                        })
                    }

                    uploadAttachmentData.push({
                        uploadId,
                        objectStorageId,
                    })

                    objectStorageAclData.push({
                        userId: ctx.get('user')!.id,
                        objectStorageId,
                    })

                    // Encode SHA-256 hash to Base64
                    const hashBase64 = encodeBase64(
                        hexToBytes(attachment.hashSha256).buffer,
                    )

                    const uploadBucket = attachment.isPublic
                        ? ctx.env.CF_R2_BUCKET_PUBLIC
                        : ctx.env.CF_R2_BUCKET_PRIVATE

                    // Get the index so that the signed URL can be matched to the object later
                    const index = signedUrls.length

                    signedUrls.push({
                        id: objectStorageId,
                        hashSha256: attachment.hashSha256,
                        encodedHash: hashBase64,
                        signedUrl: null,
                        status: 201,
                    })

                    signingPromises.push(
                        ctx
                            .get('aws4FetchClient')
                            .sign(
                                `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${uploadBucket}/${objectStorageId}?X-Amz-Expires=${ctx.env.CF_R2_PRESIGN_EXPIRY}`,
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
                            .then((signed) => {
                                signedUrls[index].signedUrl = signed.url
                            }),
                    )
                }
            }

            await Promise.all(signingPromises)

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

                return apiResponseOkWrapper(ctx, {
                    data: { uploadId, signedUrls },
                })
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
    .post(
        '/retry',
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, uploadAttachmentRetryInputSchema),
        ),
        async (ctx) => {
            const { attachments, uploadId } = ctx.req.valid('json')

            const { objectStorage, upload, uploadAttachment } =
                ctx.get('dbSchema')

            const uploadData = await ctx
                .get('dbClient')
                .select({ id: upload.id })
                .from(upload)
                .where(
                    and(
                        eq(upload.id, uploadId),
                        eq(upload.isCommitted, false),
                        ctx.get('isPrivilegedRole')
                            ? undefined
                            : eq(upload.userId, ctx.get('user')!.id),
                    ),
                )

            if (!uploadData[0]) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'Upload ID not found or is already committed.',
                    status: 404,
                })
            }

            const attachmentData = await ctx
                .get('dbClient')
                .select({
                    id: objectStorage.id,
                    isUploaded: objectStorage.isUploaded,
                    isPublic: objectStorage.isPublic,
                    hashSha256: objectStorage.hashSha256,
                })
                .from(objectStorage)
                .innerJoin(
                    uploadAttachment,
                    eq(uploadAttachment.objectStorageId, objectStorage.id),
                )
                .innerJoin(upload, eq(upload.id, uploadAttachment.uploadId))
                .where(
                    and(
                        eq(upload.id, uploadId),
                        inArray(objectStorage.id, attachments),
                    ),
                )

            const attachmentsToRetry = attachmentData.reduce(
                (accumulator, { id, isUploaded, isPublic, hashSha256 }) => {
                    accumulator.set(id, {
                        isUploaded,
                        isPublic,
                        hashSha256,
                    })
                    return accumulator
                },
                new Map<
                    string,
                    {
                        isUploaded: boolean
                        isPublic: boolean
                        hashSha256: string
                    }
                >(),
            )

            // Generate pre-signed upload URLs
            const signedUrls = await Promise.all(
                attachments.map(async (objectStorageId) => {
                    if (attachmentsToRetry.has(objectStorageId)) {
                        const { hashSha256, isUploaded, isPublic } =
                            attachmentsToRetry.get(objectStorageId)!

                        if (isUploaded) {
                            return {
                                id: objectStorageId,
                                hashSha256,
                                encodedHash: null,
                                signedUrl: null,
                                status: 409 as const,
                            }
                        }

                        // Encode SHA-256 hash to Base64
                        const hashBase64 = encodeBase64(
                            hexToBytes(hashSha256).buffer,
                        )

                        const uploadBucket = isPublic
                            ? ctx.env.CF_R2_BUCKET_PUBLIC
                            : ctx.env.CF_R2_BUCKET_PRIVATE

                        return {
                            id: objectStorageId,
                            hashSha256: hashSha256,
                            encodedHash: hashBase64,
                            signedUrl: (
                                await ctx
                                    .get('aws4FetchClient')
                                    .sign(
                                        `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${uploadBucket}/${objectStorageId}?X-Amz-Expires=${ctx.env.CF_R2_PRESIGN_EXPIRY}`,
                                        {
                                            method: 'PUT',
                                            headers: {
                                                // https://developers.cloudflare.com/r2/api/s3/api/#checksum-types
                                                'x-amz-checksum-sha256':
                                                    hashBase64,
                                            },
                                            aws: {
                                                service: 's3',
                                                signQuery: true,
                                            },
                                        },
                                    )
                            ).url,
                            status: 200 as const,
                        }
                    }

                    return {
                        id: objectStorageId,
                        hashSha256: null,
                        encodedHash: null,
                        signedUrl: null,
                        status: 404 as const,
                    }
                }),
            )

            return apiResponseOkWrapper(ctx, {
                data: { uploadId, signedUrls },
            })
        },
    )
    .post(
        '/commit',
        validator('json', async (value, ctx) =>
            validatorCallback(value, ctx, uploadAttachmentCommitInputSchema),
        ),
        async (ctx) => {
            const { attachments, uploadId } = ctx.req.valid('json')

            const { objectStorage, upload, uploadAttachment } =
                ctx.get('dbSchema')

            const uploadData = await ctx
                .get('dbClient')
                .select({ id: upload.id })
                .from(upload)
                .where(
                    and(
                        eq(upload.id, uploadId),
                        eq(upload.isCommitted, false),
                        ctx.get('isPrivilegedRole')
                            ? undefined
                            : eq(upload.userId, ctx.get('user')!.id),
                    ),
                )

            if (!uploadData[0]) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'Upload ID not found or is already committed.',
                    status: 404,
                })
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

            try {
                if (attachmentsToCommit.length > 0) {
                    await ctx
                        .get('dbClient')
                        .update(objectStorage)
                        .set({ isUploaded: true })
                        .where(inArray(objectStorage.id, attachmentsToCommit))
                }

                const data = {
                    uploadId,
                    attachments: attachmentsToCommit,
                }

                return apiResponseOkWrapper(ctx, { data })
            } catch (err) {
                throw new AppError(
                    {
                        status: 500,
                        code: 'UPLOAD_ATTACHMENT_COMMIT_FAILED',
                        message: 'Upload attachment commit failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )

export default uploadAttachmentRoute
