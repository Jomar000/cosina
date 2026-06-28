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

        // Try R2 private bucket (proof images)
        const privUrl = `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${ctx.env.CF_R2_BUCKET_PRIVATE}/${id}`
        const privResp = await ctx.get('aws4FetchClient').fetch(privUrl)
        if (privResp.ok) {
            return new Response(privResp.body, {
                headers: {
                    'Content-Type':
                        privResp.headers.get('Content-Type') ??
                        'application/octet-stream',
                    'Cache-Control': 'private, max-age=300',
                },
            })
        }

        // Try R2 public bucket (product images)
        const pubUrl = `https://${ctx.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com/${ctx.env.CF_R2_BUCKET_PUBLIC}/${id}`
        const pubResp = await ctx.get('aws4FetchClient').fetch(pubUrl)
        if (pubResp.ok) {
            return new Response(pubResp.body, {
                headers: {
                    'Content-Type':
                        pubResp.headers.get('Content-Type') ??
                        'application/octet-stream',
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            })
        }

        // Fallback to backoffice KV (legacy product images)
        let result = await ctx
            .get('kvClient')
            .getWithMetadata<{ mimeType: string }>(`img:${id}`, 'arrayBuffer')
        if (result.value) {
            return new Response(result.value as ArrayBuffer, {
                headers: {
                    'Content-Type':
                        result.metadata?.mimeType ?? 'application/octet-stream',
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            })
        }

        // Fallback to public KV (legacy proof images)
        result = await ctx.env.COSINAPUB_KV.getWithMetadata<{
            mimeType: string
        }>(`img:${id}`, 'arrayBuffer')
        if (result.value) {
            return new Response(result.value as ArrayBuffer, {
                headers: {
                    'Content-Type':
                        result.metadata?.mimeType ?? 'application/octet-stream',
                    'Cache-Control': 'public, max-age=31536000, immutable',
                },
            })
        }

        // Proxy to public API for fallback
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
