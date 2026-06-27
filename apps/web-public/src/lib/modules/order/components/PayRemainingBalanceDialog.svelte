<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import * as Dialog from '@hyperion/ui/components/dialog'
    import { Input } from '@hyperion/ui/components/input'
    import { Label } from '@hyperion/ui/components/label'
    import BanknoteIcon from '@lucide/svelte/icons/banknote'
    import CheckIcon from '@lucide/svelte/icons/check'
    import CopyIcon from '@lucide/svelte/icons/copy'
    import SmartphoneIcon from '@lucide/svelte/icons/smartphone'

    import { orderClient } from '$lib/clients'
    import ProofImageUploader from '$lib/components/upload/ProofImageUploader.svelte'

    ////////////////////
    // 01. Properties //
    ////////////////////

    type Props = {
        open: boolean
        trackingCode: string
        remainingBalance: number
        gcashAccountName: string | null
        gcashNumber: string | null
        paymentInstructions: string | null
        onSuccess: (paymentMethod: 'gcash' | 'cash_on_pickup') => void
    }

    let {
        open = $bindable(),
        trackingCode,
        remainingBalance,
        gcashAccountName,
        gcashNumber,
        paymentInstructions,
        onSuccess,
    }: Props = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const FORMATTED_BALANCE = $derived(
        new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(remainingBalance),
    )

    ///////////////
    // 03. State //
    ///////////////

    let selectedMethod = $state<'gcash' | 'cash_on_pickup' | null>(null)
    let proofObjectStorageId = $state<string | null>(null)
    let proofUploading = $state(false)
    let submitting = $state(false)
    let submitError = $state<string | null>(null)
    let gcashNumberCopied = $state(false)
    let gcashNameCopied = $state(false)
    let senderName = $state('')
    let senderNumber = $state('')
    let amountSent = $state('')

    /////////////////
    // 04. Derived //
    /////////////////

    const canSubmit = $derived(
        selectedMethod === 'cash_on_pickup' ||
            (selectedMethod === 'gcash' &&
                proofObjectStorageId !== null &&
                !proofUploading &&
                senderName.trim().length > 0 &&
                senderNumber.trim().length > 0 &&
                Number(amountSent) > 0),
    )

    //////////////////
    // 09. Handlers //
    //////////////////

    async function copyGcashNumber() {
        if (!gcashNumber) return
        await navigator.clipboard.writeText(gcashNumber.replace(/-/g, ''))
        gcashNumberCopied = true
        setTimeout(() => (gcashNumberCopied = false), 2000)
    }

    async function copyGcashName() {
        if (!gcashAccountName) return
        await navigator.clipboard.writeText(gcashAccountName)
        gcashNameCopied = true
        setTimeout(() => (gcashNameCopied = false), 2000)
    }

    async function handleSubmit() {
        if (!canSubmit || !selectedMethod) return
        submitError = null
        submitting = true

        try {
            const response = await (
                orderClient as unknown as {
                    'remaining-balance': {
                        submit: {
                            $post: (opts: {
                                json: {
                                    trackingCode: string
                                    paymentMethod: 'gcash' | 'cash_on_pickup'
                                    proofObjectStorageId?: string
                                    senderName?: string
                                    senderNumber?: string
                                    amountSent?: string
                                }
                            }) => Promise<Response>
                        }
                    }
                }
            )['remaining-balance'].submit.$post({
                json: {
                    trackingCode,
                    paymentMethod: selectedMethod,
                    proofObjectStorageId: proofObjectStorageId ?? undefined,
                    ...(selectedMethod === 'gcash' && {
                        senderName: senderName.trim(),
                        senderNumber: senderNumber.trim(),
                        amountSent: String(amountSent),
                    }),
                },
            })

            const json = (await response.json()) as {
                success: boolean
                error?: { message: string }
            }

            if (!json.success) {
                throw new Error(json.error?.message ?? 'Submission failed.')
            }

            onSuccess(selectedMethod)
            open = false
        } catch (err) {
            submitError =
                err instanceof Error ? err.message : 'Something went wrong.'
        } finally {
            submitting = false
        }
    }

    function handleOpenChange(isOpen: boolean) {
        if (!isOpen) {
            selectedMethod = null
            proofObjectStorageId = null
            submitError = null
            senderName = ''
            senderNumber = ''
            amountSent = ''
        }
        open = isOpen
    }
</script>

<Dialog.Root
    bind:open
    onOpenChange={handleOpenChange}
>
    <Dialog.Content
        class="flex max-h-[90dvh] flex-col gap-0 border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-md p-0"
    >
        <Dialog.Header class="shrink-0 border-b border-zinc-800 px-6 py-5">
            <Dialog.Title class="text-base font-semibold text-zinc-100">
                Pay Remaining Balance
            </Dialog.Title>
            <Dialog.Description class="mt-0.5 text-sm text-zinc-400">
                Remaining amount due:
                <span class="font-semibold text-white">{FORMATTED_BALANCE}</span
                >
            </Dialog.Description>
        </Dialog.Header>

        <div class="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            <!-- Method selector -->
            <div class="flex flex-col gap-2">
                <Label class="text-xs font-medium text-zinc-400">
                    How would you like to pay?
                </Label>
                <div class="grid grid-cols-2 gap-3">
                    <!-- GCash card -->
                    <button
                        type="button"
                        onclick={() => (selectedMethod = 'gcash')}
                        class="flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-sm font-medium transition-colors
                            {selectedMethod === 'gcash'
                            ? 'border-blue-500 bg-blue-500/10 text-blue-300'
                            : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800'}"
                    >
                        <SmartphoneIcon class="size-6" />
                        <span>GCash</span>
                    </button>

                    <!-- Cash on pickup card -->
                    <button
                        type="button"
                        onclick={() => (selectedMethod = 'cash_on_pickup')}
                        class="flex flex-col items-center gap-2 rounded-xl border-2 px-3 py-4 text-sm font-medium transition-colors
                            {selectedMethod === 'cash_on_pickup'
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800'}"
                    >
                        <BanknoteIcon class="size-6" />
                        <span>Cash on Pickup</span>
                    </button>
                </div>
            </div>

            <!-- GCash panel -->
            {#if selectedMethod === 'gcash'}
                <div class="flex flex-col gap-4">
                    {#if gcashAccountName || gcashNumber}
                        <!-- Payment details card -->
                        <div
                            class="overflow-hidden rounded-xl border border-blue-500/30 bg-blue-500/5"
                        >
                            <div
                                class="flex items-center gap-2.5 border-b border-blue-500/20 px-4 py-3"
                            >
                                <div
                                    class="flex size-7 items-center justify-center rounded-lg bg-blue-500/20"
                                >
                                    <SmartphoneIcon
                                        class="size-4 text-blue-400"
                                    />
                                </div>
                                <span
                                    class="text-sm font-semibold text-blue-300"
                                >
                                    Send via GCash
                                </span>
                            </div>
                            <div class="flex flex-col gap-2.5 px-4 py-3">
                                {#if gcashAccountName}
                                    <div
                                        class="flex items-center justify-between gap-2"
                                    >
                                        <span class="text-xs text-zinc-500"
                                            >Account Name</span
                                        >
                                        <div class="flex items-center gap-1.5">
                                            <span
                                                class="text-sm font-medium text-zinc-200"
                                                >{gcashAccountName}</span
                                            >
                                            <button
                                                type="button"
                                                onclick={copyGcashName}
                                                class="flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                                                aria-label="Copy account name"
                                            >
                                                {#if gcashNameCopied}
                                                    <CheckIcon
                                                        class="size-3.5  text-green-400"
                                                    />
                                                {:else}
                                                    <CopyIcon
                                                        class="size-3.5 "
                                                    />
                                                {/if}
                                            </button>
                                        </div>
                                    </div>
                                {/if}
                                {#if gcashNumber}
                                    <div
                                        class="flex items-center justify-between gap-2"
                                    >
                                        <span class="text-xs text-zinc-500"
                                            >GCash Number</span
                                        >
                                        <div class="flex items-center gap-1.5">
                                            <span
                                                class="font-mono text-sm font-semibold tracking-wide text-zinc-100"
                                                >{gcashNumber}</span
                                            >
                                            <button
                                                type="button"
                                                onclick={copyGcashNumber}
                                                class="flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                                                aria-label="Copy GCash number"
                                            >
                                                {#if gcashNumberCopied}
                                                    <CheckIcon
                                                        class="size-3.5  text-green-400"
                                                    />
                                                {:else}
                                                    <CopyIcon
                                                        class="size-3.5 "
                                                    />
                                                {/if}
                                            </button>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}

                    {#if paymentInstructions}
                        <p
                            class="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3.5 py-2.5 text-xs/relaxed text-zinc-400"
                        >
                            {paymentInstructions}
                        </p>
                    {/if}

                    <!-- Sender info fields -->
                    <div class="flex flex-col gap-3">
                        <div class="flex flex-col gap-1.5">
                            <Label
                                for="sender-name"
                                class="text-xs font-medium text-zinc-400"
                            >
                                Your GCash Account Name <span
                                    class="text-red-400">*</span
                                >
                            </Label>
                            <Input
                                id="sender-name"
                                bind:value={senderName}
                                placeholder="Enter the name on your GCash account"
                                class="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-blue-500/50"
                            />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <Label
                                for="sender-number"
                                class="text-xs font-medium text-zinc-400"
                            >
                                Your GCash Number <span class="text-red-400"
                                    >*</span
                                >
                            </Label>
                            <Input
                                id="sender-number"
                                bind:value={senderNumber}
                                placeholder="e.g. 09XX XXX XXXX"
                                class="border-zinc-700 bg-zinc-800 font-mono text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-blue-500/50"
                            />
                        </div>
                        <div class="flex flex-col gap-1.5">
                            <Label
                                for="amount-sent"
                                class="text-xs font-medium text-zinc-400"
                            >
                                Amount You Sent (₱) <span class="text-red-400"
                                    >*</span
                                >
                            </Label>
                            <Input
                                id="amount-sent"
                                bind:value={amountSent}
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                class="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-blue-500/50"
                            />
                        </div>
                    </div>

                    <!-- Proof upload -->
                    <div class="flex flex-col gap-1.5">
                        <Label class="text-xs font-medium text-zinc-400">
                            Upload Payment Screenshot <span class="text-red-400"
                                >*</span
                            >
                        </Label>
                        <ProofImageUploader
                            bind:objectStorageId={proofObjectStorageId}
                            bind:isUploading={proofUploading}
                        />
                    </div>
                </div>
            {/if}

            <!-- Cash on pickup panel -->
            {#if selectedMethod === 'cash_on_pickup'}
                <div
                    class="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
                >
                    <div class="flex items-start gap-3">
                        <BanknoteIcon
                            class="mt-0.5 size-5 shrink-0 text-amber-400"
                        />
                        <div class="flex flex-col gap-1">
                            <p class="text-sm font-semibold text-amber-300">
                                Pay Cash When You Pick Up
                            </p>
                            <p class="text-xs/relaxed text-amber-300/70">
                                You'll pay <span
                                    class="font-semibold text-amber-200"
                                    >{FORMATTED_BALANCE}</span
                                > in cash when you arrive to pick up your order. Please
                                bring the exact amount.
                            </p>
                        </div>
                    </div>
                </div>
            {/if}

            <!-- Error message -->
            {#if submitError}
                <p
                    class="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400"
                >
                    {submitError}
                </p>
            {/if}
        </div>

        <div
            class="shrink-0 border-t border-zinc-800 px-6 py-4 flex items-center gap-3"
        >
            <Button
                variant="outline"
                onclick={() => (open = false)}
                disabled={submitting}
                class="flex-1 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            >
                Cancel
            </Button>
            <Button
                onclick={handleSubmit}
                disabled={!canSubmit || submitting || proofUploading}
                class="flex-1 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            >
                {#if submitting}
                    Submitting…
                {:else if selectedMethod === 'cash_on_pickup'}
                    Confirm Cash on Pickup
                {:else}
                    Submit Payment Proof
                {/if}
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root>
