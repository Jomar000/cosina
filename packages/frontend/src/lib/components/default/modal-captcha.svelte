<script lang="ts">
    import { PUBLIC_CF_TURNSTILE_SITE_KEY } from '$env/static/public'
    import { IMG_default } from '$lib/assets/image/_index'
    import * as Dialog from '$lib/components/shadcn/dialog'

    ////////////////
    // Properties //
    ////////////////

    let {
        open,
    }: {
        open: boolean
    } = $props()
</script>

<Dialog.Root {open}>
    <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content
            class="w-[360px]"
            escapeKeydownBehavior="ignore"
            interactOutsideBehavior="ignore"
            showCloseButton={false}
        >
            <Dialog.Title class="text-center">
                CAPTCHA Verification
            </Dialog.Title>
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
                    id="captchaRenderArea"
                    data-sitekey={PUBLIC_CF_TURNSTILE_SITE_KEY}
                    class="mb-2 flex justify-center"
                ></div>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
