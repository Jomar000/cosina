import type { baseOutputSchema } from '@hyperion/validator/shared'
import { customAlphabet, nanoid } from 'nanoid'
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
 * Typed Fetch Client
 *
 * @description
 * Standard fetch client with type generics & additional tweaks.
 */
export const fetchClient = async <
    T extends z.output<ReturnType<typeof baseOutputSchema>>,
>(
    path: string,
    init?: RequestInit,
) => {
    const modPath = path.startsWith('/') ? path : `/${path}`
    const response = await fetch(`${PUBLIC_API_URL}${modPath}`, {
        ...init,
        credentials: 'include',
    })
    return (await response.json()) as T
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
 * @description
 * Handle file uploads to Cloudflare R2 object storage.
 *
 * @returns
 * An objectKey string if upload succeeded, undefined if failed.
 */
export const uploadToObjectStorage: (
    file: File,
    token: string,
    objectKey?: string,
) => Promise<string | undefined> = async (
    file,
    token,
    objectKey = nanoid(),
) => {
    try {
        // Upload object
        const objectData = new FormData()
        objectData.append('file', file)
        objectData.append('contentType', file.type)

        const response = await fetch(
            `${PUBLIC_API_URL}/internal/objectStorage/${objectKey}`,
            {
                method: 'PUT',
                headers: {
                    authorization: `Bearer ${token}`,
                },
                body: objectData,
            },
        )

        if (!response.ok) {
            objectKey = undefined
        }

        return objectKey
    } catch (err) {
        return undefined
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

    return cookies[name] ? cookies[name] : null
}
