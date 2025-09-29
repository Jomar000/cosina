import {
    objectStorageCreateDownloadLinkInputSchema,
    objectStorageCreateUploadLinkInputSchema,
} from '@hyperion/validator/internal/objectStorage'
import { eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { validator } from 'hono/validator'

import { honoValidatorCb } from '../../../utilities.js'
import { isAuthenticated } from '../../middleware/isAuthenticated.js'

const internalRouteObjectStorage = new Hono<THonoInstance>()

internalRouteObjectStorage.post(
    '/create/downloadLink',
    isAuthenticated(),
    validator('json', async (value, ctx) =>
        honoValidatorCb(value, ctx, objectStorageCreateDownloadLinkInputSchema),
    ),
    async (ctx) => {
        const { key } = ctx.req.valid('json')

        const { objectStorage, objectStorageAcl, upload, uploadAttachment } =
            ctx.get('dbSchema')

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
            .where(eq(objectStorage.id, key))

        if (objectData.length === 0) {
            return ctx.json(
                {
                    error: {
                        code: 'NOT_FOUND',
                        message: 'Object not found.',
                    },
                },
                404,
            )
        }

        const isAdminRole = [
            'admin',
            'owner',
        ].includes(ctx.get('role'))

        const isPublic = objectData[0].objectStorage.isPublic

        const hasObjectPermission =
            objectData[0].objectStorageAcl.userId === ctx.get('user')!.id &&
            objectData[0].objectStorageAcl.mode & 1

        if (!isAdminRole && !isPublic && !hasObjectPermission) {
            return ctx.json(
                {
                    error: {
                        code: 'FORBIDDEN',
                        message: 'You are not allowed to access this resource.',
                    },
                },
                403,
            )
        }

        const data = (
            await ctx
                .get('aws4FetchClient')
                .sign(
                    `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${ctx.env.CF_R2_BUCKET}/${objectData[0].objectStorage.id}?X-Amz-Expires=${300}`,
                    {
                        method: 'GET',
                        aws: { signQuery: true },
                    },
                )
        ).url

        return ctx.json({ data }, 200)
    },
)

internalRouteObjectStorage.post(
    '/create/uploadLink',
    isAuthenticated(),
    validator('json', async (value, ctx) =>
        honoValidatorCb(value, ctx, objectStorageCreateUploadLinkInputSchema),
    ),
    async (ctx) => {
        const { name, size, mimeType, hashSha256, isPublic } =
            ctx.req.valid('json')

        const { objectStorage, upload, uploadAttachment } = ctx.get('dbSchema')
    },
)

export default internalRouteObjectStorage
