<script lang="ts">
    import { Button, Dialog, Separator } from 'bits-ui'

    ////////////////
    // Properties //
    ////////////////

    let {
        open = $bindable(false),
        title = 'Alert',
        message,
        closeButtonText = 'Close',
    }: {
        open: boolean
        title?: string
        message: string
        closeButtonText?: string
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
            interactOutsideBehavior="ignore"
            class="outline-hidden fixed left-[50%]
                top-[50%] z-50
                w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] overflow-auto rounded-lg
                border border-neutral-600 bg-neutral-800 p-5
                text-neutral-200 shadow md:h-auto md:w-1/4"
        >
            <Dialog.Title
                class="flex w-full items-center justify-center text-lg font-semibold tracking-tight"
            >
                {title}
            </Dialog.Title>
            <Separator.Root class="-mx-5 mb-4 mt-5 block h-px bg-neutral-600" />
            <div
                class="relative mx-auto h-auto w-full space-y-2 overflow-auto rounded-md bg-neutral-100 md:space-y-4 dark:bg-neutral-800"
            >
                <div
                    class="mx-auto flex w-full items-center justify-center p-4"
                >
                    <p class="font-semibold text-red-600 dark:text-red-400">
                        {message}
                    </p>
                </div>
            </div>
            <div class="mt-4 flex w-full items-center justify-center space-x-4">
                <Button.Root
                    class=" w-28 cursor-pointer rounded border border-neutral-400 bg-neutral-500 px-4 py-1.5 text-sm text-white hover:bg-neutral-600"
                    onclick={() => (open = false)}
                >
                    {closeButtonText}
                </Button.Root>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
