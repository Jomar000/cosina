import { auth as authValidator } from '@hyperion/validator/public'
import { toast } from 'svelte-sonner'
import type { z } from 'zod'

import { authClient } from '$lib/clients'
import type { SessionState } from '$lib/states/session'

export type SignInPayload = z.input<typeof authValidator.signInInputSchema>

export async function signInWithCaptcha({
    errorCopyLabel,
    onCaptchaResolved,
    payload,
    session,
    setErrorCopyLabel,
    siteKey,
}: {
    errorCopyLabel: string
    onCaptchaResolved: () => void
    payload: SignInPayload
    session: SessionState
    setErrorCopyLabel: (label: string) => void
    siteKey: string
}) {
    const action = getSignInAction(payload.accountId)
    const captchaToken = await requestCaptchaToken({
        action,
        onCaptchaResolved,
        siteKey,
    })

    try {
        const endpoint =
            action === 'sign-in-email'
                ? authClient['sign-in'].email
                : authClient['sign-in'].username

        const response = await endpoint.$post(
            {
                json: {
                    organizationId: payload.organizationId,
                    accountId: payload.accountId,
                    password: payload.password,
                },
            },
            {
                headers: {
                    'x-captcha-response': captchaToken,
                },
            },
        )

        const { data, error, success } = await response.json()
        if (!success) throw new Error(error.message)

        session.set(data)
        if (!session.isValid()) {
            throw new Error('Invalid session data.')
        }

        return session.data.userRoles.length === 1
            ? `/app/${session.data.userRoles[0]}/dashboard`
            : '/app'
    } catch (err) {
        showSignInErrorToast({
            errorCopyLabel,
            message: (err as Error).message,
            setErrorCopyLabel,
        })
    }
}

function getSignInAction(accountId: string) {
    return accountId.includes('@') ? 'sign-in-email' : 'sign-in-username'
}

async function requestCaptchaToken({
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

function showSignInErrorToast({
    errorCopyLabel,
    message,
    setErrorCopyLabel,
}: {
    errorCopyLabel: string
    message: string
    setErrorCopyLabel: (label: string) => void
}) {
    toast.error('Something went wrong', {
        class: 'min-w-[360px]',
        description: message,
        action: {
            label: errorCopyLabel,
            onClick: async (event) => {
                event.preventDefault()
                await navigator.clipboard.writeText(message)
                setErrorCopyLabel('COPIED')
                setTimeout(() => setErrorCopyLabel('COPY'), 2000)
            },
        },
    })
}
