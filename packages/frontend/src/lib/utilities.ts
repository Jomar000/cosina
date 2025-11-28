import type { AppType } from '@hyperion/backend'
import type { internal, shared } from '@hyperion/validator'
import { fileTypeFromBuffer } from 'file-type'
import { hc } from 'hono/client'
import ky, { type Options } from 'ky'
import { customAlphabet } from 'nanoid'
import PQueue from 'p-queue'
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
    T extends z.output<ReturnType<typeof shared.base.outputSchema>>,
>(
    path: string,
    init?: Options,
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

type TDataToSign = {
    index: number
    name: string
    size: number
    mimeType: string
    hashSha256: string
    isPublic: boolean
}

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

type TStatusIndices = Record<string, string>

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
    const queue = new PQueue({ concurrency: 5 })

    const dataToSign: TDataToSign[] = []

    const statusIndices: TStatusIndices = {}

    let presignedUrls: z.output<
        typeof internal.objectStorage.createUploadLinkOutputSchema
    > | null = null

    ///
    // STEP #1 - Prepare metadata to be pre-signed
    ///

    try {
        for (const [
            index,
            { file, isPublic },
        ] of files.entries()) {
            const queuedFn = async () => {
                const fileBuffer = await file.arrayBuffer()

                const mimeType =
                    (await fileTypeFromBuffer(fileBuffer))?.mime ??
                    'application/octet-stream'

                // Check if the detected MIME Type matches the allowed MIME types
                // Full matches & wildcard subtypes are supported
                const matchedMimeTypes = allowedMimeTypes.filter((amt) => {
                    return (
                        mimeType === amt ||
                        (amt.includes('*') &&
                            mimeType.startsWith(
                                amt.substring(0, amt.indexOf('*')),
                            ))
                    )
                })

                if (
                    allowedMimeTypes.length > 0 &&
                    matchedMimeTypes.length === 0
                ) {
                    // Don't include invalid files to the signing request
                    return
                }

                // Compute SHA-256 checksum
                const hashBuffer = await crypto.subtle.digest(
                    'SHA-256',
                    fileBuffer,
                )

                const hashArray = Array.from(new Uint8Array(hashBuffer))

                dataToSign.push({
                    index, // Needed for matching the files to their signed URLs
                    name: file.name,
                    size: file.size,
                    mimeType,
                    hashSha256: hashArray
                        .map((b) => b.toString(16).padStart(2, '0'))
                        .join(''),
                    isPublic,
                })
            }

            queue.add(queuedFn).catch(() => {})
        }

        await queue.onIdle()
    } catch (err) {
        console.error(
            `uploadToObjectStorage.prepareMetadata: ${(err as Error).message}`,
        )
        return
    }

    ///
    // STEP #2 - Submit metadata to pre-signing endpoint
    ///

    try {
        if (dataToSign.length > 0) {
            presignedUrls = await apiClient<
                z.output<
                    typeof internal.objectStorage.createUploadLinkOutputSchema
                >
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
        const fileToUrlMap = presignedUrls
            ? dataToSign.reduce((accumulator, dts) => {
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
            : new Map<number, TFileToUrlMap>()

        // Queue files for upload
        for (const [
            index,
            { file },
        ] of files.entries()) {
            const queuedFn = async () => {
                if (fileToUrlMap.has(index)) {
                    const { encodedHash, signedUrl, status } =
                        fileToUrlMap.get(index)!

                    if (status === 409) {
                        statusIndices[index] = 'CONFLICT'
                    } else {
                        try {
                            await ky(signedUrl, {
                                method: 'PUT',
                                headers: {
                                    'x-amz-checksum-sha256': encodedHash,
                                },
                                body: file,
                            })

                            statusIndices[index] = 'UPLOADED'
                        } catch {
                            statusIndices[index] = 'FAILED'
                        }
                    }
                } else {
                    statusIndices[index] = 'INVALID'
                }
            }

            queue.add(queuedFn).catch(() => {})
        }

        // Upload queued files concurrently
        await queue.onIdle()

        return {
            uploadId: presignedUrls?.data.uploadId ?? 'N/A',
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

/**
 * @description
 * Hono RPC Client
 *
 * @link
 * https://hono.dev/docs/guides/rpc
 */
export const honoClient = hc<AppType>(PUBLIC_API_URL, {
    init: { credentials: 'include' },
    fetch: ky,
})
