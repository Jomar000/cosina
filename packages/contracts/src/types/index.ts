import { z } from 'zod'

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
        validatorIssues?: z.core.$ZodIssueBase[]
    }
}

export type TApiResponse<T> = TApiResponseOk<T> | TApiResponseError
