import type { useStorage } from 'nitro/storage'

export type TKeyValueStorage = ReturnType<typeof useStorage<string>>

export type TObjectStorageBucket = 'private' | 'public'

export type TObjectStorageSigner = {
    createDownloadUrl(options: {
        bucket: TObjectStorageBucket
        objectId: string
    }): Promise<string>
    createUploadUrl(options: {
        bucket: TObjectStorageBucket
        checksumSha256Base64: string
        objectId: string
    }): Promise<string>
    getPublicUrl(objectId: string): string
}

export type TRequestMetadata = {
    correlationId: string | null
    ipAddress: string
    userAgent: string
}
