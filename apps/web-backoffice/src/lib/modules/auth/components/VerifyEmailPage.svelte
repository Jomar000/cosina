<script lang="ts">
    import { Button } from '@cosina/ui/components/button'
    import * as Card from '@cosina/ui/components/card'
    import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
    import CircleXIcon from '@lucide/svelte/icons/circle-x'
    import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
    import { createQuery } from '@tanstack/svelte-query'

    import { page } from '$app/state'
    import { PUBLIC_NAME } from '$env/static/public'
    import { authClient } from '$lib/clients'

    ///////////////////
    // 02. Constants //
    ///////////////////

    const token = page.url.searchParams.get('token')?.trim() ?? ''
    const fallbackErrorMessage =
        'Email verification failed. The token may be invalid or expired.'

    /////////////////
    // 05. Queries //
    /////////////////

    const verificationQuery = createQuery(() => ({
        queryKey: [
            'verifyEmail',
            token,
        ],
        enabled: Boolean(token),
        queryFn: async () => {
            const response = await authClient.verifyEmail.$get({
                query: { token },
            })
            const responseJson = await response.json()

            if (!responseJson.success) {
                throw new Error(responseJson.error.message)
            }

            return responseJson.data
        },
    }))

    /////////////////
    // 10. Helpers //
    /////////////////

    function getErrorMessage() {
        if (!token) {
            return 'Email verification failed. The verification token is missing.'
        }

        return verificationQuery.error instanceof Error
            ? verificationQuery.error.message
            : fallbackErrorMessage
    }
</script>

<svelte:head>
    <title>Email verification | {PUBLIC_NAME}</title>
</svelte:head>

<main class="flex min-h-svh items-center justify-center bg-muted p-6">
    <Card.Root class="w-full max-w-md">
        <Card.Header class="items-center text-center">
            {#if token && !verificationQuery.isSuccess && !verificationQuery.isError}
                <LoaderCircleIcon
                    aria-hidden="true"
                    class="size-12 animate-spin text-muted-foreground"
                />
                <Card.Title>Verifying your email</Card.Title>
                <Card.Description>
                    Please wait while we verify your email address.
                </Card.Description>
            {:else if verificationQuery.isSuccess}
                <CircleCheckIcon
                    aria-hidden="true"
                    class="size-12 text-green-600"
                />
                <Card.Title>Email verified</Card.Title>
                <Card.Description>
                    Your email address has been successfully verified.
                </Card.Description>
            {:else}
                <CircleXIcon
                    aria-hidden="true"
                    class="size-12 text-destructive"
                />
                <Card.Title>Email verification failed</Card.Title>
                <Card.Description>{getErrorMessage()}</Card.Description>
            {/if}
        </Card.Header>
        {#if !token || verificationQuery.isSuccess || verificationQuery.isError}
            <Card.Footer>
                <Button
                    class="w-full"
                    href="/sign-in"
                >
                    Continue to sign-in
                </Button>
            </Card.Footer>
        {/if}
    </Card.Root>
</main>
