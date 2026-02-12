import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type TAppErrorDetail = {
    message: string
    code: string
    status: ContentfulStatusCode
}

export class AppError extends Error {
    public readonly name = 'AppError'
    public readonly code: TAppErrorDetail['code']
    public readonly status: TAppErrorDetail['status']

    constructor(detail: TAppErrorDetail, cause?: Error) {
        super(detail.message, { cause })
        this.code = detail.code
        this.status = detail.status
    }
}
