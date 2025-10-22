import type { objectStorageCreateUploadLinkOutputSchema } from '@hyperion/validator/internal/objectStorage'
import type { baseOutputSchema } from '@hyperion/validator/shared'
import { fileTypeFromBuffer } from 'file-type'
import ky from 'ky'
import { customAlphabet } from 'nanoid'
import type { z } from 'zod'

import { PUBLIC_API_URL } from '$env/static/public'

/**
 * Debounce Function
 *
 * @link
 * https://www.freecodecamp.org/news/javascript-debounce-example
 *
 * @link
 * https://stackoverflow.com/questions/72205837/safe-type-debounce-function-in-typescript
 */

export const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
    callback: T,
    interval = 1000,
) => {
    let timer: ReturnType<typeof setTimeout>
    return function (this: T, ...args: Parameters<T>) {
        clearTimeout(timer)
        timer = setTimeout(() => {
            callback.apply(this, args)
        }, interval)
    }
}

export const debounceLeading = <
    T extends (...args: Parameters<T>) => ReturnType<T>,
>(
    callback: T,
    interval = 1000,
) => {
    let timer: ReturnType<typeof setTimeout> | undefined = undefined
    return function (this: T, ...args: Parameters<T>) {
        if (!timer) {
            callback.apply(this, args)
        }
        clearTimeout(timer)
        timer = setTimeout(() => {
            timer = undefined
        }, interval)
    }
}

/**
 * NanoID Custom Character Set
 *
 * @description
 * Generate NanoIDs with custom alphabet & length fit for use as identifiers.
 *
 * @link
 * https://zelark.github.io/nano-id-cc
 */
export const nanoidCustom = customAlphabet(
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    12,
)

/**
 * API Client
 *
 * @description
 * Handle calls to Internal APIs using Ky HTTP client.
 *
 * @link
 * https://github.com/sindresorhus/ky
 */
export const apiClient = async <
    T extends z.output<ReturnType<typeof baseOutputSchema>>,
>(
    path: string,
    init?: RequestInit,
) => {
    return ky<T>(path, {
        ...init,
        credentials: 'include',
        prefixUrl: PUBLIC_API_URL,
    }).json()
}

/**
 * @description
 * Strip properties with values considered as empty such as '', null & undefined.
 */
export const stripEmptyProps = <T = unknown>(obj: Record<string, unknown>) => {
    return JSON.parse(
        JSON.stringify(obj, (_k, v) =>
            v !== null && v !== undefined && v !== '' ? v : undefined,
        ),
    ) as T
}

/**
 * Object Storage Client
 *
 * @description
 * Handle file uploads to Cloudflare R2 object storage.
 *
 * @param files
 * The files to be uploaded. isPublic flag is set if the file is viewable by anyone.
 *
 * @param allowedMimeTypes
 * An array of allowed MIME types to be uploaded.
 * Unmatched files will be skipped from being uploaded.
 * Default is an empty array which means any file is allowed.
 *
 * @returns
 * The Object IDs of the files if upload succeeded.
 * If a duplicate is found, will return the Object ID of the existing object.
 * When upload fails, undefined will be returned.
 */

type TFileToUrlMap =
    | {
          key: string
          encodedHash: string
          signedUrl: string
          status: 200
      }
    | {
          key: string
          encodedHash: null
          signedUrl: null
          status: 409
      }

type TStatusIndices = {
    conflict: number[]
    failed: number[]
    uploaded: number[]
}

export const objectStorageClient: (
    files: {
        file: File
        isPublic: boolean
    }[],
    allowedMimeTypes?: string[],
) => Promise<
    | {
          uploadId: string
          status: TStatusIndices
      }
    | undefined
> = async (files, allowedMimeTypes = []) => {
    ///
    // STEP #1 - Prepare metadata to be pre-signed
    ///

    const dataToSign = (
        await Promise.all(
            files.map(async ({ file, isPublic }, index) => {
                const fileBuffer = await file.arrayBuffer()
                const mimeType =
                    (await fileTypeFromBuffer(fileBuffer.slice(0, 32)))?.mime ??
                    'application/octet-stream'

                if (
                    allowedMimeTypes.length > 0 &&
                    !allowedMimeTypes.includes(mimeType)
                ) {
                    return undefined
                }

                // Compute SHA-256 checksum
                const hashBuffer = await crypto.subtle.digest(
                    'SHA-256',
                    fileBuffer,
                )
                const hashArray = Array.from(new Uint8Array(hashBuffer))

                return {
                    index, // Needed for matching the files to their signed URLs
                    name: file.name,
                    size: file.size,
                    mimeType,
                    hashSha256: hashArray
                        .map((b) => b.toString(16).padStart(2, '0'))
                        .join(''),
                    isPublic,
                }
            }),
        )
    ).filter((data) => data !== undefined)

    ///
    // STEP #2 - Submit metadata to pre-signing endpoint
    ///

    let presignedUrls: z.output<
        typeof objectStorageCreateUploadLinkOutputSchema
    > | null = null

    try {
        presignedUrls = await apiClient<
            z.output<typeof objectStorageCreateUploadLinkOutputSchema>
        >('internal/objectStorage/create/uploadLink', {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-csrf-token': getCookie('csrf_token') ?? '',
            },
            body: JSON.stringify(dataToSign),
        })

        if (!presignedUrls) {
            throw new Error('Failed to request pre-signed URLs.')
        }

        if ('error' in presignedUrls) {
            console.error(presignedUrls.validationErrors)
            throw new Error(presignedUrls.error.message)
        }
    } catch (err) {
        console.error(
            `uploadToObjectStorage.requestSignature: ${(err as Error).message}`,
        )
        return
    }

    ///
    // STEP #3 - Upload to CloudFlare R2
    ///

    try {
        // Map the files to their pre-signed URLs via ther SHA-256 checksum
        const fileToUrlMap = dataToSign.reduce((accumulator, dts) => {
            const {
                0: { key, hash, encodedHash, signedUrl, status },
            } = presignedUrls.data.signedUrls.filter(
                (psu) => psu.hash === dts.hashSha256,
            )
            const {
                0: { index },
            } = dataToSign.filter((dts) => dts.hashSha256 === hash)
            accumulator.set(index, {
                key,
                encodedHash,
                signedUrl,
                status,
            } as TFileToUrlMap)
            return accumulator
        }, new Map<number, TFileToUrlMap>())

        // Store the indices of the processed files based on their status
        const statusIndices: TStatusIndices = {
            conflict: [],
            failed: [],
            uploaded: [],
        }

        await Promise.all(
            files.map(async ({ file }, index) => {
                const { encodedHash, signedUrl, status } =
                    fileToUrlMap.get(index)!

                if (status === 409) {
                    statusIndices.conflict.push(index)
                } else {
                    try {
                        await ky(signedUrl, {
                            method: 'PUT',
                            headers: {
                                'x-amz-checksum-sha256': encodedHash,
                            },
                            body: file,
                        })

                        statusIndices.uploaded.push(index)
                    } catch {
                        statusIndices.failed.push(index)
                    }
                }
            }),
        )

        return {
            uploadId: presignedUrls.data.uploadId,
            status: statusIndices,
        }
    } catch (err) {
        console.error(`uploadToObjectStorage.upload: ${(err as Error).message}`)
        return
    }
}

/**
 * Get Cookie
 *
 * @description
 * Helper utility for parsing cookies.
 */

export const getCookie = (name: string) => {
    if (!name) {
        return null
    }

    const cookies = document.cookie
        .split('; ')
        .map((cookie) => cookie.split('='))
        .reduce(
            (accumulator, [
                    name,
                    ...rest
                ]) => {
                accumulator[name] = rest.join('=')
                return accumulator
            },
            {} as Record<string, string>,
        )

    return cookies[name] ?? null
}
