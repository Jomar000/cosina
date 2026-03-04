import { customAlphabet } from 'nanoid'

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
 * Format bytes to a more readable notation
 */
export const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) {
        return '0 bytes'
    }

    const b = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = [
        'bytes',
        'KiB',
        'MiB',
        'GiB',
        'TiB',
        'PiB',
        'EiB',
        'ZiB',
        'YiB',
    ]

    const i = Math.floor(Math.log(bytes) / Math.log(b))

    return `${parseFloat((bytes / Math.pow(b, i)).toFixed(dm))} ${sizes[i]}`
}
