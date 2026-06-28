import { Hono } from 'hono'

import type { THonoInstance } from '../../../types.js'
import { corsHandler } from '../../middleware/corsHandler.js'
import { csrfHandler } from '../../middleware/csrfHandler.js'
import { initContext } from '../../middleware/initContext.js'
import { wsOriginGuard } from '../../middleware/wsOriginGuard.js'
import { adminRoute } from './admin/index.js'
import { authRoute } from './auth.js'
import { heartbeatRoute } from './heartbeat.js'
import { objectStorageRoute } from './objectStorage/index.js'
import { userRoute } from './user/index.js'
import { wsRoute } from './ws.js'

export const apiRoute = new Hono<THonoInstance>()
    /**
     * @description
     * Middleware
     */
    .use('/*', corsHandler('default'))
    .use('/*', csrfHandler())
    .use('/*', initContext())
    .use('/ws/*', wsOriginGuard())
    /**
     * @description
     * Routes
     */
    .get('/image/view/:id', async (ctx) => {
        const id = ctx.req.param('id')
        // Check backoffice KV first (product images), then public KV (proof images)
        let result = await ctx
            .get('kvClient')
            .getWithMetadata<{ mimeType: string }>(`img:${id}`, 'arrayBuffer')
        if (!result.value) {
            result = await ctx.env.COSINAPUB_KV.getWithMetadata<{
                mimeType: string
            }>(`img:${id}`, 'arrayBuffer')
        }
        if (result.value) {
            return new Response(result.value as ArrayBuffer, {
                headers: {
                    'Content-Type':
                        result.metadata?.mimeType ?? 'application/octet-stream',
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            })
        }
        // Proxy to public API for proof images stored in its isolated KV
        const upstream = await fetch(
            `${ctx.env.URL_PUB_BACKEND}/api/image/view/${id}`,
        )
        if (!upstream.ok) return ctx.text('Not found', 404)
        return new Response(upstream.body, {
            headers: {
                'Content-Type':
                    upstream.headers.get('Content-Type') ??
                    'application/octet-stream',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        })
    })
    .route('/admin', adminRoute)
    .route('/auth', authRoute)
    .route('/heartbeat', heartbeatRoute)
    .route('/objectStorage', objectStorageRoute)
    .route('/user', userRoute)
    .route('/ws', wsRoute)

export default apiRoute
