import { uploadCommitInputSchema } from '@cosina/validator/public/objectStorage'
import { and, eq, inArray, notInArray } from 'drizzle-orm'
import { Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import { AppError } from '../../../../errors.js'
import type { TGlobalApiResponses, THonoInstance } from '../../../../types.js'
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
    .post('/create', async (ctx) => {
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

            await auditTrailLogger(ctx, {
                component: 'objectStorage.upload',
                action: 'create',
                description: 'Upload session created',
                records: { table: 'upload', id: uploadId },
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
    })
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
                                        attachments.length > 0
                                            ? notInArray(
                                                  objectStorage.id,
                                                  attachments,
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

export type UploadRouteType = ApplyGlobalResponse<
    typeof uploadRoute,
    TGlobalApiResponses
>

export default uploadRoute
