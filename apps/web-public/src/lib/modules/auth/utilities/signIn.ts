import { auth as authValidator } from '@hyperion/validator/public'
import { toast } from 'svelte-sonner'
import type { z } from 'zod'

import { authClient } from '$lib/clients'
import type { SessionState } from '$lib/states/session'
import { requestCaptchaToken } from '$lib/utilities/helpers'

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
                ? authClient.signIn.email
                : authClient.signIn.username

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

        const responseJson = await response.json()
        if (!responseJson.success) {
            throw new Error(responseJson.error.message)
        }

        session.set(responseJson.data)
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
