import { cors } from 'hono/cors'
import { createMiddleware } from 'hono/factory'

export const corsHandler = (mode: 'default' | 'reflect' = 'default') => {
    return createMiddleware<THonoInstance>(async (ctx, next) => {
        // Skip CORS on WebSockets Route
        // https://github.com/honojs/hono/issues/3206#issuecomment-2410593981
        if (ctx.req.path.startsWith('/internal/ws')) {
            await next()
            return
        }

        let allowedOrigins: string[] = [ctx.env.URL_FRONTEND]

        if (mode === 'reflect') {
            allowedOrigins = ctx.req.header('origin')
                ? [ctx.req.header('origin')!]
                : []
        }

        const corsMiddlewareHandler = cors({
            origin: allowedOrigins,
            ...(ctx.env.CORS_ALLOW_METHODS
                ? { allowMethods: ctx.env.CORS_ALLOW_METHODS.split(',') }
                : {}),
            ...(ctx.env.CORS_ALLOW_HEADERS
                ? { allowHeaders: ctx.env.CORS_ALLOW_HEADERS.split(',') }
                : {}),
            maxAge: Number(ctx.env.CORS_MAX_AGE) || 7200,
            ...(ctx.env.CORS_ALLOW_CREDENTIALS
                ? { credentials: Boolean(ctx.env.CORS_ALLOW_CREDENTIALS) }
                : {}),
            ...(ctx.env.CORS_EXPOSE_HEADERS
                ? { exposeHeaders: ctx.env.CORS_EXPOSE_HEADERS.split(',') }
                : {}),
        })

        return corsMiddlewareHandler(ctx, next)
    })
}
