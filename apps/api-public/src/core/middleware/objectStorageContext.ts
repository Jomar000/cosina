import { createMiddleware } from 'hono/factory'

import type { THonoInstance } from '../../types.js'
import { getObjectStorageSigner } from '../adapters/nitroRuntime.js'

export const objectStorageContext = () => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        ctx.set('objectStorageSigner', getObjectStorageSigner())

        await next()
    })
}
