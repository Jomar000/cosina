import { z } from 'zod'

export * as internal from './internal/index.js'
export * as shared from './shared/index.js'

export type TApiResponseOk<T> = {
    success: true
    data: T
    count?: number
    limit?: number
    offset?: number
}

export type TApiResponseError = {
    success: false
    error: {
        requestId: string
        code: string
        message: string
        validatorIssues?: z.core.$ZodIssue[]
    }
}

export type TApiResponse<T> = TApiResponseOk<T> | TApiResponseError
