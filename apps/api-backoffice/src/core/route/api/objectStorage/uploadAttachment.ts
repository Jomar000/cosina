import {
    uploadAttachmentCommitInputSchema,
    uploadAttachmentCreateInputSchema,
    uploadAttachmentRetryInputSchema,
} from '@hyperion/validator/backoffice/objectStorage'
import { hexToBytes } from '@noble/hashes/utils.js'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { encodeBase64 } from 'hono/utils/encode'

import { AppError } from '../../../../errors.js'
import type { THonoInstance } from '../../../../types.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
    auditTrailLogger,
    nanoidCustom,
} from '../../../../utilities/helpers.js'
import { validateRequest } from '../../../middleware/validateRequest.js'

export const uploadAttachmentRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .post(
        '/create',
        validateRequest('json', uploadAttachmentCreateInputSchema),
        async (ctx) => {
            const { attachments, uploadId } = ctx.req.valid('json')

            const {
                objectStorage,
                objectStorageAcl,
                upload,
                uploadAttachment,
            } = ctx.get('dbSchema')

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

            const hashesToCheck = attachments.map(
                ({ hashSha256 }) => hashSha256,
            )

            try {
                const preparedSignedUrls = await ctx
                    .get('dbClient')
                    .transaction(async (tx) => {
                        const [activeUpload] = await tx
                            .update(upload)
                            .set({ isCommitted: false })
                            .where(
                                and(
                                    eq(upload.id, uploadId),
                                    eq(upload.isCommitted, false),
                                    ctx.get('isPrivilegedRole')
                                        ? undefined
                                        : eq(
                                              upload.userId,
                                              ctx.get('user')!.id,
                                          ),
                                ),
                            )
                            .returning({ id: upload.id })

                        if (!activeUpload) {
                            throw new AppError({
                                status: 409,
                                code: 'UPLOAD_ALREADY_COMMITTED',
                                message: 'Upload is already committed.',
                            })
                        }

                        for (const hashSha256 of [
                            ...hashesToCheck,
                        ].sort()) {
                            await tx.execute(
                                sql`SELECT pg_advisory_xact_lock(hashtextextended(${hashSha256}, 0))`,
                            )
                        }

                        const existingObjects = await tx
                            .select({
                                id: objectStorage.id,
                                hashSha256: objectStorage.hashSha256,
                                isPublic: objectStorage.isPublic,
                                isUploaded: objectStorage.isUploaded,
                            })
                            .from(objectStorage)
                            .where(
                                inArray(
                                    objectStorage.hashSha256,
                                    hashesToCheck,
                                ),
                            )

                        const existingObjectsByHashAndBucket = new Map(
                            existingObjects.map((os) => [
                                `${os.hashSha256}:${String(os.isPublic)}`,
                                os,
                            ]),
                        )

                        const objectStorageData: Pick<
                            typeof objectStorage.$inferInsert,
                            | 'id'
                            | 'size'
                            | 'mimeType'
                            | 'hashSha256'
                            | 'isPublic'
                        >[] = []

                        const objectStorageAclData: Pick<
                            typeof objectStorageAcl.$inferInsert,
                            'userId' | 'objectStorageId'
                        >[] = []

                        const uploadAttachmentData: Pick<
                            typeof uploadAttachment.$inferInsert,
                            'uploadId' | 'objectStorageId'
                        >[] = []

                        const prepared: {
                            id: string
                            hashSha256: string
                            encodedHash: string | null
                            isPublic: boolean
                            status: 201 | 409
                        }[] = []

                        for (const attachment of attachments) {
                            const existingObject =
                                existingObjectsByHashAndBucket.get(
                                    `${attachment.hashSha256}:${String(
                                        attachment.isPublic,
                                    )}`,
                                )

                            const objectStorageId =
                                existingObject?.id ?? nanoidCustom(32)
                            const isPublic =
                                existingObject?.isPublic ?? attachment.isPublic

                            if (!existingObject) {
                                objectStorageData.push({
                                    id: objectStorageId,
                                    ...attachment,
                                    isPublic,
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

                            if (existingObject?.isUploaded) {
                                prepared.push({
                                    id: objectStorageId,
                                    hashSha256: attachment.hashSha256,
                                    encodedHash: null,
                                    isPublic,
                                    status: 409,
                                })
                                continue
                            }

                            prepared.push({
                                id: objectStorageId,
                                hashSha256: attachment.hashSha256,
                                encodedHash: encodeBase64(
                                    hexToBytes(attachment.hashSha256).buffer,
                                ),
                                isPublic,
                                status: 201,
                            })
                        }

                        if (objectStorageData.length > 0) {
                            await tx
                                .insert(objectStorage)
                                .values(objectStorageData)
                        }

                        await tx
                            .insert(objectStorageAcl)
                            .values(objectStorageAclData)
                            .onConflictDoNothing()

                        await tx
                            .insert(uploadAttachment)
                            .values(uploadAttachmentData)
                            .onConflictDoNothing()

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'objectStorage.uploadAttachment',
                                action: 'create',
                                description:
                                    'Attachments added to upload session',
                                records: { table: 'upload', id: uploadId },
                            },
                            tx,
                        )

                        return prepared
                    })

                const signedUrls = await Promise.all(
                    preparedSignedUrls.map(async (prepared) => {
                        if (prepared.status === 409) {
                            return {
                                id: prepared.id,
                                hashSha256: prepared.hashSha256,
                                encodedHash: null,
                                signedUrl: null,
                                status: prepared.status,
                            }
                        }

                        const uploadBucket = prepared.isPublic
                            ? ctx.env.CF_R2_BUCKET_PUBLIC
                            : ctx.env.CF_R2_BUCKET_PRIVATE

                        const signed = await ctx
                            .get('aws4FetchClient')
                            .sign(
                                `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${uploadBucket}/${prepared.id}?X-Amz-Expires=${ctx.env.CF_R2_PRESIGN_EXPIRY}`,
                                {
                                    method: 'PUT',
                                    headers: {
                                        // https://developers.cloudflare.com/r2/api/s3/api/#checksum-types
                                        'x-amz-checksum-sha256':
                                            prepared.encodedHash!,
                                    },
                                    aws: {
                                        service: 's3',
                                        signQuery: true,
                                    },
                                },
                            )

                        return {
                            id: prepared.id,
                            hashSha256: prepared.hashSha256,
                            encodedHash: prepared.encodedHash,
                            signedUrl: signed.url,
                            status: prepared.status,
                        }
                    }),
                )

                return apiResponseOkWrapper(ctx, {
                    data: { uploadId, signedUrls },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

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
        validateRequest('json', uploadAttachmentRetryInputSchema),
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
        validateRequest('json', uploadAttachmentCommitInputSchema),
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

            try {
                const data = await ctx
                    .get('dbClient')
                    .transaction(async (tx) => {
                        const [activeUpload] = await tx
                            .update(upload)
                            .set({ isCommitted: false })
                            .where(
                                and(
                                    eq(upload.id, uploadId),
                                    eq(upload.isCommitted, false),
                                    ctx.get('isPrivilegedRole')
                                        ? undefined
                                        : eq(
                                              upload.userId,
                                              ctx.get('user')!.id,
                                          ),
                                ),
                            )
                            .returning({ id: upload.id })

                        if (!activeUpload) {
                            throw new AppError({
                                status: 409,
                                code: 'UPLOAD_ALREADY_COMMITTED',
                                message: 'Upload is already committed.',
                            })
                        }

                        const requestedAttachmentIds = [
                            ...new Set(attachments),
                        ]

                        const attachmentsToCommit = await tx
                            .select({
                                id: objectStorage.id,
                                isUploaded: objectStorage.isUploaded,
                            })
                            .from(uploadAttachment)
                            .innerJoin(
                                objectStorage,
                                eq(
                                    objectStorage.id,
                                    uploadAttachment.objectStorageId,
                                ),
                            )
                            .where(
                                and(
                                    eq(uploadAttachment.uploadId, uploadId),
                                    inArray(
                                        objectStorage.id,
                                        requestedAttachmentIds,
                                    ),
                                ),
                            )

                        if (
                            attachmentsToCommit.length !==
                            requestedAttachmentIds.length
                        ) {
                            throw new AppError({
                                status: 404,
                                code: 'UPLOAD_ATTACHMENTS_NOT_FOUND',
                                message: 'Upload attachments not found.',
                            })
                        }

                        if (
                            attachmentsToCommit.some(
                                ({ isUploaded }) => isUploaded,
                            )
                        ) {
                            throw new AppError({
                                status: 409,
                                code: 'UPLOAD_ATTACHMENTS_ALREADY_COMMITTED',
                                message:
                                    'Upload attachments are already committed.',
                            })
                        }

                        const committedAttachments = await tx
                            .update(objectStorage)
                            .set({ isUploaded: true })
                            .where(
                                and(
                                    eq(objectStorage.isUploaded, false),
                                    inArray(
                                        objectStorage.id,
                                        attachmentsToCommit.map(({ id }) => id),
                                    ),
                                ),
                            )
                            .returning({ id: objectStorage.id })

                        if (committedAttachments.length === 0) {
                            throw new AppError({
                                status: 409,
                                code: 'UPLOAD_ATTACHMENTS_ALREADY_COMMITTED',
                                message:
                                    'Upload attachments are already committed.',
                            })
                        }

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'objectStorage.uploadAttachment',
                                action: 'commit',
                                description: 'Attachments marked as uploaded',
                                records: committedAttachments.map(({ id }) => ({
                                    table: 'object_storage',
                                    id,
                                    oldData: { isUploaded: false },
                                })),
                            },
                            tx,
                        )

                        return {
                            uploadId,
                            attachments: committedAttachments.map(
                                ({ id }) => id,
                            ),
                        }
                    })

                return apiResponseOkWrapper(ctx, { data })
            } catch (err) {
                if (err instanceof AppError) throw err

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
