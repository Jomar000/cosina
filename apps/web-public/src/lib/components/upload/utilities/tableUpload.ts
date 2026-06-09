import { fileTypeFromBuffer } from 'file-type'
import ky from 'ky'
import PQueue from 'p-queue'

import { objectStorageClient } from '$lib/clients'

export type UploadMetadata = {
    file: File
    objectId: string
    isPublic: boolean
    mimeType: string
    previewUrl: string | null
    hashSha256: string
    status: 'QUEUED' | 'UPLOADED' | 'FAILED'
}

export type UploadMode = 'NEW' | 'UPDATE'

export type PrepareUploadFilesResult = {
    maxItemsReached: boolean
    queuedFiles: UploadMetadata[]
}

export function getUploadMode(uploadId: string): UploadMode {
    return uploadId === '' ? 'NEW' : 'UPDATE'
}

export async function createUploadId() {
    const response = await objectStorageClient.upload.create.$post()
    const responseJson = await response.json()
    if (!responseJson.success) {
        throw new Error(responseJson.error.message)
    }
    return responseJson.data.uploadId
}

export async function prepareUploadFiles({
    allowedMimeTypes,
    existingFiles,
    maxItems,
    selectedFiles,
}: {
    allowedMimeTypes: string[]
    existingFiles: UploadMetadata[]
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
            isPublic: false,
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
    queuedFiles,
    uploadId,
}: {
    queuedFiles: UploadMetadata[]
    uploadId: string
}) {
    if (queuedFiles.length === 0) return

    const signingResponse =
        await objectStorageClient.upload.attachment.create.$post({
            json: {
                uploadId,
                attachments: queuedFiles.map((file) => ({
                    size: `${file.file.size}`,
                    hashSha256: file.hashSha256,
                    isPublic: file.isPublic,
                    mimeType: file.mimeType,
                })),
            },
        })

    const responseJson = await signingResponse.json()
    if (!responseJson.success) {
        throw new Error(responseJson.error.message)
    }

    const uploadQueue = new PQueue({ concurrency: 3 })

    for (const signedUpload of responseJson.data.signedUrls) {
        uploadQueue
            .add(() => uploadSignedFile(signedUpload, queuedFiles, uploadId))
            .catch(() => {})
    }

    await uploadQueue.onIdle()
}

export async function retryUploadFile({
    file,
    uploadId,
}: {
    file: UploadMetadata
    uploadId: string
}) {
    const retryResponse =
        await objectStorageClient.upload.attachment.retry.$post({
            json: {
                uploadId,
                attachments: [file.objectId],
            },
        })

    const responseJson = await retryResponse.json()
    if (!responseJson.success) {
        throw new Error(responseJson.error.message)
    }

    for (const signedUpload of responseJson.data.signedUrls) {
        if (signedUpload.status === 409) {
            file.status = 'UPLOADED'
        } else if (signedUpload.status === 200) {
            await uploadRetrySignedFile(signedUpload, file, uploadId)
        } else {
            file.status = 'FAILED'
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
) {
    const file = queuedFiles.find(
        (queuedFile) => queuedFile.hashSha256 === signedUpload.hashSha256,
    )

    if (!file) return

    file.objectId = signedUpload.id

    if (signedUpload.status === 409) {
        file.status = 'UPLOADED'
        return
    }

    try {
        await putSignedFile(signedUpload, file.file)
        await commitUploadedFile(uploadId, signedUpload.id)
        file.status = 'UPLOADED'
    } catch {
        file.status = 'FAILED'
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
) {
    try {
        await putSignedFile(signedUpload, file.file)
        await commitUploadedFile(uploadId, file.objectId)
        file.status = 'UPLOADED'
    } catch {
        file.status = 'FAILED'
    }
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
    const response = await objectStorageClient.upload.attachment.commit.$post({
        json: {
            uploadId,
            attachments: [objectId],
        },
    })

    const responseJson = await response.json()
    if (!responseJson.success) {
        throw new Error(responseJson.error.message)
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
