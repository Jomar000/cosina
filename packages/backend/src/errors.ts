import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type TAppErrorDetail = {
    message: string
    code: string
    status: ContentfulStatusCode
    requestId: string
}

export type TAppDbTransactionError = {
    message: string
    code: string
    status: ContentfulStatusCode
}

export class AppError extends Error {
    public readonly name = 'AppError'
    public readonly code: TAppErrorDetail['code']
    public readonly status: TAppErrorDetail['status']
    public readonly requestId: TAppErrorDetail['requestId']

    constructor(detail: TAppErrorDetail, cause?: Error) {
        super(detail.message, { cause })
        this.code = detail.code
        this.status = detail.status
        this.requestId = detail.requestId
    }
}

export class AppDbTransactionError extends Error {
    public readonly name = 'AppDbTransactionError'
    public readonly code: TAppDbTransactionError['code']
    public readonly status: TAppDbTransactionError['status']

    constructor(detail: TAppDbTransactionError) {
        super(detail.message)
        this.code = detail.code
        this.status = detail.status
    }
}
