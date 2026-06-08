import { customAlphabet } from 'nanoid'
import { debounce as createDebounce } from 'perfect-debounce'

export const debounce = <T extends (...args: Parameters<T>) => ReturnType<T>>(
    callback: T,
    interval = 1000,
) => createDebounce(callback, interval)

export const debounceLeading = <
    T extends (...args: Parameters<T>) => ReturnType<T>,
>(
    callback: T,
    interval = 1000,
) => createDebounce(callback, interval, { leading: true, trailing: false })

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

export async function requestCaptchaToken({
    action,
    onCaptchaResolved,
    siteKey,
}: {
    action: string
    onCaptchaResolved: () => void
    siteKey: string
}) {
    return new Promise<string>((resolve) => {
        turnstile.execute('#captchaRenderArea', {
            sitekey: siteKey,
            action,
            callback: (token: string) => {
                onCaptchaResolved()
                turnstile.remove('#captchaRenderArea')
                resolve(token)
            },
        })
    })
}

/**
 * @description
 * Strip properties with values considered empty: '', null, and undefined.
 * Pass allowEmptyString to preserve '' while still stripping null and undefined.
 */
export const stripEmptyProps = <T = unknown>(
    obj: Record<string, unknown>,
    options: { allowEmptyString?: boolean } = {},
) => {
    return JSON.parse(
        JSON.stringify(obj, (_k, v) =>
            v !== null &&
            v !== undefined &&
            (options.allowEmptyString || v !== '')
                ? v
                : undefined,
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
