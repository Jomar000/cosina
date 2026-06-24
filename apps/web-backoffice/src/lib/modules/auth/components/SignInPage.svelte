<script lang="ts">
    import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end'

    import { PUBLIC_NAME } from '$env/static/public'
    import CaptchaModal from '$lib/components/modal/CaptchaModal.svelte'
    import SignInForm from '$lib/modules/auth/components/SignInForm.svelte'
    import { useSessionContext } from '$lib/states/session'

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()

    let showCaptchaModal = $state(false)
</script>

<svelte:head>
    <title>Sign-in | {PUBLIC_NAME}</title>
</svelte:head>

<div
    class="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10"
>
    <div class="flex w-full max-w-sm flex-col gap-6">
        <a
            href="##"
            class="flex items-center gap-2 self-center font-medium"
            tabindex={-1}
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
        />
    </div>
</div>
<CaptchaModal open={showCaptchaModal} />
