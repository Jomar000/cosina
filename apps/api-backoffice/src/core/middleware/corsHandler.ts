import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'

import type { THonoInstance } from '../../types.js'

export const corsHandler = (mode: 'default' | 'reflect' = 'default') => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        // Skip CORS on WebSockets Route
        // https://github.com/honojs/hono/issues/3206#issuecomment-2410593981
        if (ctx.req.path.startsWith('/api/ws')) {
            await next()
            return
        }

        const appConfig = ctx.get('appConfig')
        let allowedOrigins: string[] = [appConfig.url.frontend]

        if (mode === 'reflect') {
            allowedOrigins = ctx.req.header('origin')
                ? [ctx.req.header('origin')!]
                : []
        }

        // Credentials must never be allowed in reflect mode — doing so would
        // permit any origin to make credentialed requests, bypassing CORS entirely.
        const allowCredentials =
            mode !== 'reflect' && appConfig.cors.allowCredentials

        const corsMiddlewareHandler = cors({
            origin: allowedOrigins,
            ...(appConfig.cors.allowMethods
                ? {
                      allowMethods: appConfig.cors.allowMethods
                          .split(',')
                          .map((s) => s.trim()),
                  }
                : {}),
            ...(appConfig.cors.allowHeaders
                ? {
                      allowHeaders: appConfig.cors.allowHeaders
                          .split(',')
                          .map((s) => s.trim()),
                  }
                : {}),
            maxAge: appConfig.cors.maxAge,
            ...(allowCredentials ? { credentials: true } : {}),
            ...(appConfig.cors.exposeHeaders
                ? {
                      exposeHeaders: appConfig.cors.exposeHeaders
                          .split(',')
                          .map((s) => s.trim()),
                  }
                : {}),
        })

        return corsMiddlewareHandler(ctx, next)
    })
}
