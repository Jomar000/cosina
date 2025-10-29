<script lang="ts">
    import { PUBLIC_CF_TURNSTILE_SITE_KEY } from '$env/static/public'
    import { IMG_default } from '$lib/assets/image/_index.js'
    import {
        Dialog,
        DialogContent,
        DialogOverlay,
        DialogPortal,
        DialogTitle,
    } from '$lib/components/shadcn/dialog/index.js'

    ////////////////
    // Properties //
    ////////////////

    let {
        open,
    }: {
        open: boolean
    } = $props()
</script>

<Dialog {open}>
    <DialogPortal>
        <DialogOverlay />
        <DialogContent
            class="w-[360px]"
            escapeKeydownBehavior="ignore"
            interactOutsideBehavior="ignore"
            showCloseButton={false}
        >
            <DialogTitle class="text-center">CAPTCHA Verification</DialogTitle>
            <div
                class="relative mx-auto h-auto w-full space-y-2 overflow-auto rounded-md md:space-y-4"
            >
                <img
                    src={IMG_default}
                    class="mx-auto mb-2 h-20"
                    alt=""
                />
                <p
                    class="mb-2 text-center text-sm font-normal text-neutral-900 dark:text-neutral-200"
                >
                    Hang on, we are checking a few things...
                </p>
                <div
                    id="captchaModalRenderArea"
                    data-sitekey={PUBLIC_CF_TURNSTILE_SITE_KEY}
                    class="mb-2 flex justify-center"
                ></div>
            </div>
        </DialogContent>
    </DialogPortal>
</Dialog>
