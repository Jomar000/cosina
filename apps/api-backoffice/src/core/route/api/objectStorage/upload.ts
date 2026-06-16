import {
    uploadCommitInputSchema,
    uploadCreateInputSchema,
} from '@hyperion/validator/backoffice/objectStorage'
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'

import { AppError } from '../../../../errors.js'
import type { THonoInstance } from '../../../../types.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
    auditTrailLogger,
    nanoidCustom,
} from '../../../../utilities/helpers.js'
import { validateRequest } from '../../../middleware/validateRequest.js'

export const uploadRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .post(
        '/create',
        validateRequest('json', uploadCreateInputSchema),
        async (ctx) => {
            const { idempotencyKey } = ctx.req.valid('json')
            const { upload } = ctx.get('dbSchema')

            try {
                const uploadId = await ctx
                    .get('dbClient')
                    .transaction(async (tx) => {
                        await tx.execute(
                            sql`SELECT pg_advisory_xact_lock(hashtextextended(${idempotencyKey}, 0))`,
                        )

                        const [existingUpload] = await tx
                            .select({
                                id: upload.id,
                                userId: upload.userId,
                            })
                            .from(upload)
                            .where(eq(upload.idempotencyKey, idempotencyKey))

                        if (existingUpload) {
                            if (existingUpload.userId !== ctx.get('user')!.id) {
                                throw new AppError({
                                    status: 409,
                                    code: 'IDEMPOTENCY_KEY_CONFLICT',
                                    message:
                                        'Idempotency Key was already used by another user.',
                                })
                            }

                            return existingUpload.id
                        }

                        const newUploadId = nanoidCustom(16)

                        await tx.insert(upload).values({
                            id: newUploadId,
                            userId: ctx.get('user')!.id,
                            idempotencyKey,
                        })

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'objectStorage.upload',
                                action: 'create',
                                description: 'Upload session created',
                                records: { table: 'upload', id: newUploadId },
                            },
                            tx,
                        )

                        return newUploadId
                    })

                return apiResponseOkWrapper(ctx, {
                    data: { uploadId },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'UPLOAD_ID_CREATION_FAILED',
                        message: 'Upload ID creation failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )
    .post(
        '/commit',
        validateRequest('json', uploadCommitInputSchema),
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
                const committedAttachments = await ctx
                    .get('dbClient')
                    .transaction(async (tx) => {
                        const [committedUpload] = await tx
                            .update(upload)
                            .set({ isCommitted: true })
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

                        if (!committedUpload) {
                            throw new AppError({
                                status: 409,
                                code: 'UPLOAD_ALREADY_COMMITTED',
                                message: 'Upload is already committed.',
                            })
                        }

                        const requestedAttachmentIds = [
                            ...new Set(attachments),
                        ]

                        if (requestedAttachmentIds.length > 0) {
                            const selectedAttachments = await tx
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
                                selectedAttachments.length !==
                                requestedAttachmentIds.length
                            ) {
                                throw new AppError({
                                    status: 404,
                                    code: 'UPLOAD_ATTACHMENTS_NOT_FOUND',
                                    message: 'Upload attachments not found.',
                                })
                            }

                            if (
                                selectedAttachments.some(
                                    ({ isUploaded }) => !isUploaded,
                                )
                            ) {
                                throw new AppError({
                                    status: 409,
                                    code: 'UPLOAD_ATTACHMENTS_NOT_COMMITTED',
                                    message:
                                        'Upload attachments are not committed.',
                                })
                            }
                        }

                        const attachmentsToPurge = (
                            await tx
                                .select({ id: objectStorage.id })
                                .from(upload)
                                .innerJoin(
                                    uploadAttachment,
                                    eq(upload.id, uploadAttachment.uploadId),
                                )
                                .innerJoin(
                                    objectStorage,
                                    eq(
                                        objectStorage.id,
                                        uploadAttachment.objectStorageId,
                                    ),
                                )
                                .where(
                                    and(
                                        eq(upload.id, uploadId),
                                        requestedAttachmentIds.length > 0
                                            ? notInArray(
                                                  objectStorage.id,
                                                  requestedAttachmentIds,
                                              )
                                            : undefined,
                                    ),
                                )
                        ).map(({ id }) => id)

                        if (attachmentsToPurge.length > 0) {
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
                        }

                        await auditTrailLogger(
                            ctx,
                            {
                                component: 'objectStorage.upload',
                                action: 'commit',
                                description: 'Upload committed',
                                records: [
                                    {
                                        table: 'upload',
                                        id: uploadId,
                                        oldData: { isCommitted: false },
                                    },
                                    ...attachmentsToPurge.map(
                                        (objectStorageId) => ({
                                            table: 'upload_attachment',
                                            id: `${uploadId}:${objectStorageId}`,
                                            oldData: {
                                                uploadId,
                                                objectStorageId,
                                            },
                                        }),
                                    ),
                                ],
                            },
                            tx,
                        )

                        return await tx
                            .select({ id: objectStorage.id })
                            .from(upload)
                            .innerJoin(
                                uploadAttachment,
                                eq(upload.id, uploadAttachment.uploadId),
                            )
                            .innerJoin(
                                objectStorage,
                                eq(
                                    objectStorage.id,
                                    uploadAttachment.objectStorageId,
                                ),
                            )
                            .where(eq(upload.id, uploadId))
                    })

                return apiResponseOkWrapper(ctx, {
                    data: {
                        uploadId,
                        attachments: committedAttachments.map(({ id }) => id),
                    },
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'UPLOAD_COMMIT_FAILED',
                        message: 'Upload commit failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )

export default uploadRoute
