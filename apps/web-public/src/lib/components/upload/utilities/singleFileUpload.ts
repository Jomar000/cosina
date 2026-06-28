import { fileTypeFromBuffer } from 'file-type'
import ky from 'ky'
import PQueue from 'p-queue'

import { PUBLIC_API_URL } from '$env/static/public'
import { getCookie, getCsrfCookieName } from '$lib/utilities/helpers'

export type UploadMetadata = {
    file: File
    objectId: string
    isPublic: boolean
    mimeType: string
    previewUrl: string | null
    hashSha256: string
    status: 'QUEUED' | 'UPLOADING' | 'UPLOADED' | 'FAILED'
}

export type UploadMode = 'NEW' | 'UPDATE'

export type PrepareUploadFilesResult = {
    maxItemsReached: boolean
    queuedFiles: UploadMetadata[]
}

export type UploadFileChangeHandler = (file: UploadMetadata) => void

const CSRF_COOKIE_NAME = getCsrfCookieName(import.meta.env.MODE)

function getCsrfHeaders(): Record<string, string> {
    const csrfToken = getCookie(CSRF_COOKIE_NAME)
    if (csrfToken) {
        return { 'x-csrf-token': decodeURIComponent(csrfToken) }
    }
    return {}
}

export function getUploadMode(uploadId: string): UploadMode {
    return uploadId === '' ? 'NEW' : 'UPDATE'
}

export async function createUploadId() {
    const response = await fetch(
        `${PUBLIC_API_URL}/api/order/proof/r2/upload/create`,
        {
            method: 'POST',
            credentials: 'include',
            headers: getCsrfHeaders(),
        },
    )

    const responseJson = (await response.json()) as {
        success: boolean
        data?: { uploadId: string }
        error?: { message: string }
    }
    if (!responseJson.success) {
        throw new Error(
            responseJson.error?.message ?? 'Failed to create upload',
        )
    }

    return responseJson.data!.uploadId
}

export async function commitUploadSession({
    objectIds,
    uploadId,
}: {
    objectIds: string[]
    uploadId: string
}) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    Object.assign(headers, getCsrfHeaders())

    const response = await fetch(
        `${PUBLIC_API_URL}/api/order/proof/r2/upload/commit`,
        {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
                attachments: objectIds,
            }),
        },
    )

    const responseJson = (await response.json()) as {
        success: boolean
        data?: { attachments: string[] }
        error?: { message: string }
    }
    if (!responseJson.success) {
        throw new Error(
            responseJson.error?.message ?? 'Failed to commit upload',
        )
    }

    return { attachments: responseJson.data!.attachments, uploadId }
}

export async function prepareUploadFiles({
    allowedMimeTypes,
    existingFiles,
    isPublic,
    maxItems,
    selectedFiles,
}: {
    allowedMimeTypes: string[]
    existingFiles: UploadMetadata[]
    isPublic: boolean
    maxItems: number
    selectedFiles: FileList
}): Promise<PrepareUploadFilesResult> {
    const queuedFiles: UploadMetadata[] = []
    let maxItemsReached = existingFiles.length >= maxItems

    if (maxItemsReached) {
        return {
            maxItemsReached,
            queuedFiles,
        }
    }

    for (const file of Array.from(selectedFiles)) {
        const fileBuffer = await file.arrayBuffer()
        const mimeType =
            (await fileTypeFromBuffer(fileBuffer))?.mime ??
            'application/octet-stream'

        if (!isAllowedMimeType(mimeType, allowedMimeTypes)) {
            continue
        }

        const hashSha256 = await hashFileBuffer(fileBuffer)

        if (hasDuplicateHash(hashSha256, existingFiles, queuedFiles)) {
            continue
        }

        if (existingFiles.length + queuedFiles.length >= maxItems) {
            maxItemsReached = true
            break
        }

        queuedFiles.push({
            file,
            objectId: '',
            hashSha256,
            isPublic,
            mimeType,
            previewUrl: mimeType.startsWith('image/')
                ? URL.createObjectURL(file)
                : null,
            status: 'QUEUED',
        })
    }

    return {
        maxItemsReached,
        queuedFiles,
    }
}

export async function uploadQueuedFiles({
    onFileChange,
    queuedFiles,
    uploadId,
}: {
    onFileChange?: UploadFileChangeHandler
    queuedFiles: UploadMetadata[]
    uploadId: string
}) {
    if (queuedFiles.length === 0) return

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    Object.assign(headers, getCsrfHeaders())

    const signingResponse = await fetch(
        `${PUBLIC_API_URL}/api/order/proof/r2/upload/attachment/create`,
        {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
                uploadId,
                attachments: queuedFiles.map((file) => ({
                    size: file.file.size,
                    hashSha256: file.hashSha256,
                    isPublic: file.isPublic,
                    mimeType: file.mimeType,
                })),
            }),
        },
    )

    const responseJson = (await signingResponse.json()) as {
        success: boolean
        data?: {
            signedUrls: Array<{
                id: string
                signedUrl?: string | null
                encodedHash?: string | null
                status: number
            }>
        }
        error?: { message: string }
    }
    if (!responseJson.success) {
        throw new Error(
            responseJson.error?.message ?? 'Failed to get signed URLs',
        )
    }

    const uploadQueue = new PQueue({ concurrency: 3 })

    for (const signedUpload of responseJson.data!.signedUrls) {
        uploadQueue.add(() =>
            uploadSignedFile(signedUpload, queuedFiles, uploadId, onFileChange),
        )
    }

    await uploadQueue.onIdle()
}

export async function retryUploadFile({
    file,
    onFileChange,
    uploadId,
}: {
    file: UploadMetadata
    onFileChange?: UploadFileChangeHandler
    uploadId: string
}) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    Object.assign(headers, getCsrfHeaders())

    const retryResponse = await fetch(
        `${PUBLIC_API_URL}/api/order/proof/r2/upload/attachment/create`,
        {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
                uploadId,
                attachments: [
                    {
                        size: file.file.size,
                        hashSha256: file.hashSha256,
                        isPublic: file.isPublic,
                        mimeType: file.mimeType,
                    },
                ],
            }),
        },
    )

    const responseJson = (await retryResponse.json()) as {
        success: boolean
        data?: {
            signedUrls: Array<{
                id: string
                signedUrl?: string | null
                encodedHash?: string | null
                status: number
            }>
        }
        error?: { message: string }
    }
    if (!responseJson.success) {
        throw new Error(responseJson.error?.message ?? 'Failed to retry upload')
    }

    for (const signedUpload of responseJson.data!.signedUrls) {
        if (signedUpload.status === 409) {
            updateFile(file, { status: 'UPLOADED' }, onFileChange)
        } else if (signedUpload.status === 201 || signedUpload.status === 200) {
            await uploadRetrySignedFile(
                signedUpload,
                file,
                uploadId,
                onFileChange,
            )
        } else {
            updateFile(file, { status: 'FAILED' }, onFileChange)
        }
    }
}

export function removeUploadFile(files: UploadMetadata[], hashSha256: string) {
    revokePreviewUrls(files.filter((file) => file.hashSha256 === hashSha256))
    return files.filter((file) => file.hashSha256 !== hashSha256)
}

export function revokePreviewUrls(files: UploadMetadata[]) {
    for (const file of files) {
        if (file.previewUrl) {
            URL.revokeObjectURL(file.previewUrl)
            file.previewUrl = null
        }
    }
}

async function uploadSignedFile(
    signedUpload: {
        encodedHash?: string | null
        hashSha256: string
        id: string
        signedUrl?: string | null
        status: number
    },
    queuedFiles: UploadMetadata[],
    uploadId: string,
    onFileChange?: UploadFileChangeHandler,
) {
    const file = queuedFiles.find(
        (queuedFile) => queuedFile.hashSha256 === signedUpload.hashSha256,
    )

    if (!file) return

    updateFile(file, { objectId: signedUpload.id }, onFileChange)

    if (signedUpload.status === 409) {
        updateFile(file, { status: 'UPLOADED' }, onFileChange)
        return
    }

    try {
        updateFile(file, { status: 'UPLOADING' }, onFileChange)
        await putSignedFile(signedUpload, file.file)
        await commitUploadedFile(uploadId, signedUpload.id)
        updateFile(file, { status: 'UPLOADED' }, onFileChange)
    } catch {
        updateFile(file, { status: 'FAILED' }, onFileChange)
    }
}

async function uploadRetrySignedFile(
    signedUpload: {
        encodedHash?: string | null
        id: string
        signedUrl?: string | null
    },
    file: UploadMetadata,
    uploadId: string,
    onFileChange?: UploadFileChangeHandler,
) {
    try {
        updateFile(file, { status: 'UPLOADING' }, onFileChange)
        await putSignedFile(signedUpload, file.file)
        await commitUploadedFile(uploadId, file.objectId)
        updateFile(file, { status: 'UPLOADED' }, onFileChange)
    } catch {
        updateFile(file, { status: 'FAILED' }, onFileChange)
    }
}

function updateFile(
    file: UploadMetadata,
    values: Partial<Pick<UploadMetadata, 'objectId' | 'status'>>,
    onFileChange?: UploadFileChangeHandler,
) {
    Object.assign(file, values)
    onFileChange?.(file)
}

async function putSignedFile(
    signedUpload: {
        encodedHash?: string | null
        signedUrl?: string | null
    },
    file: File,
) {
    await ky(signedUpload.signedUrl!, {
        method: 'PUT',
        headers: {
            'x-amz-checksum-sha256': signedUpload.encodedHash!,
        },
        body: file,
    })
}

async function commitUploadedFile(uploadId: string, objectId: string) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    }
    Object.assign(headers, getCsrfHeaders())

    const response = await fetch(
        `${PUBLIC_API_URL}/api/order/proof/r2/upload/commit`,
        {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify({
                attachments: [objectId],
            }),
        },
    )

    const responseJson = (await response.json()) as {
        success: boolean
        error?: { message: string }
    }
    if (!responseJson.success) {
        throw new Error(responseJson.error?.message ?? 'Failed to commit file')
    }
}

async function hashFileBuffer(fileBuffer: ArrayBuffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer)
    return Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')
}

function hasDuplicateHash(
    hashSha256: string,
    existingFiles: UploadMetadata[],
    queuedFiles: UploadMetadata[],
) {
    return (
        existingFiles.some((file) => file.hashSha256 === hashSha256) ||
        queuedFiles.some((file) => file.hashSha256 === hashSha256)
    )
}

function isAllowedMimeType(mimeType: string, allowedMimeTypes: string[]) {
    if (allowedMimeTypes.length === 0) return true

    return allowedMimeTypes.some((allowedMimeType) => {
        return (
            mimeType === allowedMimeType ||
            (allowedMimeType.includes('*') &&
                mimeType.startsWith(
                    allowedMimeType.substring(0, allowedMimeType.indexOf('*')),
                ))
        )
    })
}
