import {
    objectStorageCreateDownloadLinkInputSchema,
    objectStorageCreateUploadLinkInputSchema,
} from '@hyperion/validator/internal/objectStorage'
import { eq, inArray } from 'drizzle-orm'
import { Hono } from 'hono'
import { validator } from 'hono/validator'

import { honoValidatorCb, nanoidCustom } from '../../../utilities.js'
import { isAuthenticated } from '../../middleware/isAuthenticated.js'

const internalRouteObjectStorage = new Hono<THonoInstance>()

internalRouteObjectStorage.post(
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
            .where(inArray(objectStorage.id, providedKeys))

        const isAdminRole = [
            'admin',
            'owner',
        ].includes(ctx.get('role'))

        const signedUrls: {
            key: string
            signedUrl: string | null
            status: 200 | 403 | 404
        }[] = []

        // Non-existent Keys
        for (const key of providedKeys) {
            const isObjectFound = objectData
                .map(({ objectStorage }) => objectStorage.id)
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
            const isPublic = obj.objectStorage.isPublic

            const hasObjectPermission =
                obj.objectStorageAcl.userId === ctx.get('user')!.id &&
                obj.objectStorageAcl.mode & 1

            if (isAdminRole || isPublic || hasObjectPermission) {
                signedUrls.push({
                    key: obj.objectStorage.id,
                    signedUrl: (
                        await ctx
                            .get('aws4FetchClient')
                            .sign(
                                `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${ctx.env.CF_R2_BUCKET}/${obj.objectStorage.id}?X-Amz-Expires=${300}`,
                                {
                                    method: 'GET',
                                    aws: { signQuery: true },
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

internalRouteObjectStorage.post(
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
            'id' | 'name' | 'size' | 'mimeType' | 'hashSha256' | 'isPublic'
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
            signedUrl: string | null
            status: 200 | 409
        }[] = []

        // Duplicate SHA-256 checksum detection
        const hashesToCheck = objectData.map(({ hashSha256 }) => hashSha256)

        const existingObjects = await ctx
            .get('dbClient')
            .select({
                id: objectStorage.id,
                hashSha256: objectStorage.hashSha256,
            })
            .from(objectStorage)
            .where(inArray(objectStorage.hashSha256, hashesToCheck))

        const duplicateHashes = existingObjects.map(
            ({ hashSha256 }) => hashSha256,
        )

        // Generate an Upload ID for this batch
        const uploadId = nanoidCustom(16)

        // Generate pre-signed upload URLs
        for (const obj of objectData) {
            if (duplicateHashes.includes(obj.hashSha256)) {
                signedUrls.push({
                    key: existingObjects.filter(
                        ({ hashSha256 }) => hashSha256 === obj.hashSha256,
                    )[0].id,
                    signedUrl: null,
                    status: 409,
                })
            } else {
                const objectStorageId = nanoidCustom(32)

                objectStorageData.push({
                    id: objectStorageId,
                    ...obj,
                    size: BigInt(obj.size),
                })

                uploadAttachmentData.push({ uploadId, objectStorageId })

                objectStorageAclData.push({
                    userId: ctx.get('user')!.id,
                    objectStorageId,
                })

                signedUrls.push({
                    key: objectStorageId,
                    signedUrl: (
                        await ctx
                            .get('aws4FetchClient')
                            .sign(
                                `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${ctx.env.CF_R2_BUCKET}/${objectStorageId}?X-Amz-Expires=${300}`,
                                {
                                    method: 'PUT',
                                    headers: {
                                        'x-amz-checksum-sha256': obj.hashSha256,
                                    },
                                    aws: { signQuery: true },
                                },
                            )
                    ).url,
                    status: 200,
                })
            }
        }

        // Save object metadata to DB
        if (objectStorageData.length > 0) {
            await ctx.get('dbClient').transaction(async (tx) => {
                await tx.insert(upload).values({
                    id: uploadId,
                    userId: ctx.get('user')!.id,
                })
                await tx.insert(objectStorage).values(objectStorageData)
                await tx.insert(uploadAttachment).values(uploadAttachmentData)
                await tx.insert(objectStorageAcl).values(objectStorageAclData)
            })
        }

        return ctx.json({ data: signedUrls }, 200)
    },
)

export default internalRouteObjectStorage
