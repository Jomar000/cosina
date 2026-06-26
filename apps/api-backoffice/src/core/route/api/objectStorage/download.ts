import {
    downloadLinkCreateInputSchema,
    downloadReadManyInputSchema,
} from '@hyperion/validator/backoffice/objectStorage'
import { and, asc, count as countFn, desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'

import { AppError } from '../../../../errors.js'
import type { THonoInstance } from '../../../../types.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
    apiResponsePaginatedOkWrapper,
} from '../../../../utilities/helpers.js'
import { validateRequest } from '../../../middleware/validateRequest.js'

export const downloadRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Routes
     */
    .post(
        '/link/create',
        validateRequest('json', downloadLinkCreateInputSchema),
        async (ctx) => {
            const { uploadId } = ctx.req.valid('json')

            const {
                objectStorage,
                objectStorageAcl,
                upload,
                uploadAttachment,
            } = ctx.get('dbSchema')

            const linkedObjects = await ctx
                .get('dbClient')
                .select({
                    objectStorage,
                    objectStorageAcl,
                    uploadAttachment,
                    upload,
                })
                .from(objectStorage)
                .leftJoin(
                    objectStorageAcl,
                    and(
                        eq(objectStorageAcl.objectStorageId, objectStorage.id),
                        eq(objectStorageAcl.userId, ctx.get('user')!.id),
                    ),
                )
                .innerJoin(
                    uploadAttachment,
                    eq(uploadAttachment.objectStorageId, objectStorage.id),
                )
                .innerJoin(upload, eq(upload.id, uploadAttachment.uploadId))
                .where(
                    and(
                        eq(upload.id, uploadId),
                        eq(upload.isCommitted, true),
                        eq(objectStorage.isUploaded, true),
                        ctx.get('isPrivilegedRole')
                            ? undefined
                            : eq(upload.userId, ctx.get('user')!.id),
                    ),
                )

            if (linkedObjects.length === 0) {
                return apiResponseErrorWrapper(ctx, {
                    code: 'NOT_FOUND',
                    message: 'Upload ID not found.',
                    status: 404,
                })
            }

            const downloadUrls = await Promise.all(
                linkedObjects.map(
                    async ({ objectStorage: os, objectStorageAcl: osa }) => {
                        const isPublicObject = os.isPublic

                        const hasObjectPermission =
                            osa !== null &&
                            osa.userId === ctx.get('user')!.id &&
                            Boolean(osa.mode & 1)

                        if (
                            ctx.get('isPrivilegedRole') ||
                            isPublicObject ||
                            hasObjectPermission
                        ) {
                            if (
                                isPublicObject &&
                                !ctx.env.CF_R2_BUCKET_PUBLIC_URL
                            ) {
                                throw new AppError({
                                    status: 500,
                                    code: 'PUBLIC_R2_URL_NOT_CONFIGURED',
                                    message: 'Public R2 URL is not configured.',
                                })
                            }

                            const downloadUrl = isPublicObject
                                ? `${ctx.env.CF_R2_BUCKET_PUBLIC_URL}/${os.id}`
                                : (
                                      await ctx
                                          .get('aws4FetchClient')
                                          .sign(
                                              `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${ctx.env.CF_R2_BUCKET_PRIVATE}/${os.id}?X-Amz-Expires=${ctx.env.CF_R2_PRESIGN_EXPIRY}`,
                                              {
                                                  method: 'GET',
                                                  aws: {
                                                      service: 's3',
                                                      signQuery: true,
                                                  },
                                              },
                                          )
                                  ).url

                            return {
                                objectStorageId: os.id,
                                downloadUrl,
                                status: 201 as const,
                            }
                        }

                        return {
                            objectStorageId: os.id,
                            downloadUrl: null,
                            status: 403 as const,
                        }
                    },
                ),
            )

            return apiResponseOkWrapper(ctx, {
                data: { downloadUrls },
            })
        },
    )
    .get(
        '/readMany',
        validateRequest('query', downloadReadManyInputSchema),
        async (ctx) => {
            const { limit, offset, sortOrder } = ctx.req.valid('query')

            const { objectStorage, upload, uploadAttachment } =
                ctx.get('dbSchema')

            try {
                const searchCondition = and(
                    eq(upload.isCommitted, true),
                    eq(objectStorage.isUploaded, true),
                    ctx.get('isPrivilegedRole')
                        ? undefined
                        : eq(upload.userId, ctx.get('user')!.id),
                )

                const count = (
                    await ctx
                        .get('dbClient')
                        .select({
                            count: countFn(uploadAttachment.objectStorageId),
                        })
                        .from(uploadAttachment)
                        .innerJoin(
                            objectStorage,
                            eq(
                                objectStorage.id,
                                uploadAttachment.objectStorageId,
                            ),
                        )
                        .innerJoin(
                            upload,
                            eq(upload.id, uploadAttachment.uploadId),
                        )
                        .where(searchCondition)
                )[0].count

                const data = await ctx
                    .get('dbClient')
                    .select({
                        uploadId: upload.id,
                        objectStorageId: objectStorage.id,
                        size: objectStorage.size,
                        mimeType: objectStorage.mimeType,
                        hashSha256: objectStorage.hashSha256,
                        isPublic: objectStorage.isPublic,
                        objectCreatedAt: objectStorage.createdAt,
                        uploadCreatedAt: upload.createdAt,
                    })
                    .from(uploadAttachment)
                    .innerJoin(
                        objectStorage,
                        eq(objectStorage.id, uploadAttachment.objectStorageId),
                    )
                    .innerJoin(upload, eq(upload.id, uploadAttachment.uploadId))
                    .where(searchCondition)
                    .limit(limit)
                    .offset(offset)
                    .orderBy(
                        sortOrder === 'asc'
                            ? asc(upload.createdAt)
                            : desc(upload.createdAt),
                    )

                return apiResponsePaginatedOkWrapper(ctx, {
                    data,
                    count,
                    limit,
                    offset,
                })
            } catch (err) {
                if (err instanceof AppError) throw err

                throw new AppError(
                    {
                        status: 500,
                        code: 'DOWNLOAD_LIST_RETRIEVAL_FAILED',
                        message: 'Download list retrieval failed.',
                    },
                    err instanceof Error ? err : undefined,
                )
            }
        },
    )

export default downloadRoute
