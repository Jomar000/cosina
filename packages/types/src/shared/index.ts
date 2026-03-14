export type TValidatorIssue = {
    path?: PropertyKey[]
    code: string
    message: string
    input?: unknown
}

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
        validatorIssues?: TValidatorIssue[]
    }
}

export type TApiResponse<T> = TApiResponseOk<T> | TApiResponseError
