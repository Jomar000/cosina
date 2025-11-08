<script lang="ts">
    import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end'
    import { onMount } from 'svelte'

    import { goto } from '$app/navigation'
    import { PUBLIC_NAME } from '$env/static/public'
    import CaptchaModal from '$lib/components/default/modal-captcha.svelte'
    import SignInForm from '$lib/components/default/sign-in.svelte'
    import { useAuthContext } from '$lib/states/auth/index.js'
    import { useSessionContext } from '$lib/states/session/index.js'

    //////////////
    // Contexts //
    //////////////

    const session = useSessionContext()
    const auth = useAuthContext()

    ////////////////////
    // Initialization //
    ////////////////////

    let render = $state(false)
    let showCaptchaModal = $state(false)

    ///////////////
    // Lifecycle //
    ///////////////

    onMount(() => {
        if (!session.isValid()) {
            render = true
        } else {
            if (session.data.userRoles.length === 1) {
                goto(`/app/${session.data.userRoles[0]}/dashboard`)
            } else {
                goto('/app')
            }
        }
    })
</script>

<svelte:head>
    <title>Sign-in | {PUBLIC_NAME}</title>
</svelte:head>

{#if render}
    <div
        class="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10"
    >
        <div class="flex w-full max-w-sm flex-col gap-6">
            <a
                href="##"
                class="flex items-center gap-2 self-center font-medium"
            >
                <div
                    class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
                >
                    <GalleryVerticalEndIcon class="size-4" />
                </div>
                Acme Inc.
            </a>
            <SignInForm
                bind:showCaptchaModal
                {session}
                {auth}
            />
        </div>
    </div>
    <CaptchaModal open={showCaptchaModal} />
{/if}
