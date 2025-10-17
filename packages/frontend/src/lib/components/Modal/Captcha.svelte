<script lang="ts">
    import { Dialog, Separator } from 'bits-ui'

    import { PUBLIC_CF_TURNSTILE_SITE_KEY } from '$env/static/public'
    import { IMG_LOGO } from '$lib/assets/image/_index.js'

    ////////////////
    // Properties //
    ////////////////

    let {
        open = $bindable(false),
    }: {
        open: boolean
    } = $props()
</script>

<Dialog.Root {open}>
    <Dialog.Portal>
        <Dialog.Overlay
            class="data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
            fixed inset-0 z-50 bg-black/80"
        />
        <Dialog.Content
            escapeKeydownBehavior="ignore"
            interactOutsideBehavior="ignore"
            class="fixed top-[50%] left-[50%]
                z-50 w-full
                max-w-sm translate-x-[-50%] translate-y-[-50%] overflow-auto rounded-lg border
                border-neutral-300 bg-neutral-200 p-5 text-neutral-200 shadow outline-hidden
                md:h-auto md:w-[600px] dark:border-neutral-600 dark:bg-neutral-800"
        >
            <Dialog.Title
                class="flex w-full items-center justify-center text-lg font-semibold tracking-tight text-neutral-600 dark:text-neutral-200"
            >
                CAPTCHA Verification
            </Dialog.Title>
            <Separator.Root class="-mx-5 mt-4 mb-4 block h-px bg-neutral-300" />
            <div
                class="relative mx-auto h-auto w-full space-y-2 overflow-auto rounded-md md:space-y-4"
            >
                <img
                    src={IMG_LOGO}
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
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
