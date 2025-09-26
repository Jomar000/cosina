import { objectStoragePutInputSchema } from '@hyperion/validator/internal/objectStorage'
import {
    ListBucketsCommand,
    ListObjectsV2Command,
    GetObjectCommand,
    PutObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Hono } from 'hono'

import { isAuthenticated } from '../../middleware/isAuthenticated.js'

const internalRouteObjectStorage = new Hono<THonoInstance>()

internalRouteObjectStorage.post(
    '/create/downloadLink',
    isAuthenticated(),
    async (ctx) => {
        // Check if valid key
        // Check permissions

        const data = await getSignedUrl(
            ctx.get('r2ClientS3Api'),
            new GetObjectCommand({
                Bucket: 'hoasys-dev-public',
                Key: 'dog.png',
            }),
            { expiresIn: 120 },
        )

        return ctx.json({ data }, 200)
    },
)

internalRouteObjectStorage.post(
    '/create/uploadLink',
    isAuthenticated(),
    async (ctx) => {
        //
    },
)

export default internalRouteObjectStorage
