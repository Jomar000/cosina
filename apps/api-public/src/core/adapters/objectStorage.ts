import { AwsClient } from 'aws4fetch'

import type {
    TObjectStorageBucket,
    TObjectStorageSigner,
} from '../contracts.js'

export type TObjectStorageConfig = {
    accessKeyId: string
    endpointUrl: string
    presignExpiry: number | string
    privateBucket: string
    publicBucket: string
    publicBaseUrl: string
    secretAccessKey: string
}

const trimTrailingSlash = (value: string) => {
    return value.replace(/\/+$/, '')
}

export const createS3CompatibleObjectStorageSigner = (
    config: TObjectStorageConfig,
): TObjectStorageSigner => {
    const aws4FetchClient = new AwsClient({
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
    })

    const getBucketName = (bucket: TObjectStorageBucket) => {
        return bucket === 'public' ? config.publicBucket : config.privateBucket
    }

    const createObjectStorageUrl = (
        bucket: TObjectStorageBucket,
        objectId: string,
    ) => {
        return `${trimTrailingSlash(config.endpointUrl)}/${getBucketName(bucket)}/${objectId}?X-Amz-Expires=${config.presignExpiry}`
    }

    return {
        createDownloadUrl: async ({ bucket, objectId }) => {
            const signed = await aws4FetchClient.sign(
                createObjectStorageUrl(bucket, objectId),
                {
                    method: 'GET',
                    aws: {
                        service: 's3',
                        signQuery: true,
                    },
                },
            )

            return signed.url
        },
        createUploadUrl: async ({ bucket, checksumSha256Base64, objectId }) => {
            const signed = await aws4FetchClient.sign(
                createObjectStorageUrl(bucket, objectId),
                {
                    method: 'PUT',
                    headers: {
                        'x-amz-checksum-sha256': checksumSha256Base64,
                    },
                    aws: {
                        service: 's3',
                        signQuery: true,
                    },
                },
            )

            return signed.url
        },
        getPublicUrl: (objectId: string) => {
            return `${trimTrailingSlash(config.publicBaseUrl)}/${objectId}`
        },
    }
}
