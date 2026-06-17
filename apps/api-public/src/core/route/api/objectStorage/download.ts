import { downloadLinkCreateInputSchema } from '@hyperion/validator/public/objectStorage'
import { and, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import type { ApplyGlobalResponse } from 'hono/client'

import type { TGlobalApiResponses, THonoInstance } from '../../../../types.js'
import {
    apiResponseErrorWrapper,
    apiResponseOkWrapper,
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

export type DownloadRouteType = ApplyGlobalResponse<
    typeof downloadRoute,
    TGlobalApiResponses
>

export default downloadRoute
