import { objectStoragePutInputSchema } from '@hyperion/validator/internal/objectStorage'
import { Hono } from 'hono'

import { isAuthenticated } from '../middleware/isAuthenticated.js'

const internalRouteObjectStorage = new Hono<THonoInstance>()

internalRouteObjectStorage.get('/:key', isAuthenticated(), async (ctx) => {
    const key = ctx.req.param('key')

    if (key.length < 1 || key.length > 64) {
        return ctx.json(
            {
                success: false,
                message:
                    'Invalid object key. Minimum of 1 and a maximum of 64 character(s).',
            },
            400,
        )
    }

    const r2Object = await ctx.get('r2Client').get(key)

    if (!r2Object) {
        return ctx.json(
            {
                success: false,
                message: 'Object not found.',
            },
            404,
        )
    }

    return new Response(r2Object.body, {
        status: 200,
        headers: {
            'Content-Type':
                r2Object.customMetadata?.contentType ||
                'application/octet-stream',
            'Cache-Control': 'max-age=604800',
            ETag: r2Object.httpEtag,
        },
    })
})

internalRouteObjectStorage.put('/:key', isAuthenticated(), async (ctx) => {
    const key = ctx.req.param('key')

    if (key.length < 1 || key.length > 64) {
        return ctx.json(
            {
                success: false,
                message:
                    'Invalid object key. Minimum of 1 and a maximum of 64 character(s).',
            },
            400,
        )
    }

    let body:
        | Awaited<ReturnType<typeof ctx.req.parseBody>>
        | Record<string, unknown> = {}

    try {
        body = await ctx.req.parseBody()
    } catch (error) {
        return ctx.json(
            {
                success: false,
                message: 'Malformed object data received.',
            },
            400,
        )
    }

    const validator = await objectStoragePutInputSchema.safeParseAsync(body)

    if (!validator.data) {
        return ctx.json(
            {
                success: false,
                message: 'An error occurred while validating input data.',
                validationErrors: validator.error.issues,
            },
            400,
        )
    }

    try {
        const { objectStorage } = ctx.get('dbSchema')
        const { file, contentType, ownerId } = validator.data

        await Promise.all([
            // Upload File to R2
            ctx.get('r2Client').put(key, file, {
                customMetadata: {
                    contentType,
                    uploadedBy: ctx.get('session')!.userId,
                    ...(ownerId ? { ownerId } : {}),
                },
            }),
            // Save Upload Details
            ctx
                .get('dbClient')
                .insert(objectStorage)
                .values({
                    id: key,
                    uploadedBy: ctx.get('session')!.userId,
                }),
        ])

        return ctx.json({ success: true }, 200)
    } catch (error) {
        return ctx.json({ success: false, message: 'File upload failed.' }, 400)
    }
})

export default internalRouteObjectStorage
