<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import * as Calendar from '@hyperion/ui/components/calendar'
    import * as Dialog from '@hyperion/ui/components/dialog'
    import { Input } from '@hyperion/ui/components/input'
    import { Label } from '@hyperion/ui/components/label'
    import * as Popover from '@hyperion/ui/components/popover'
    import * as Select from '@hyperion/ui/components/select'
    import { Separator } from '@hyperion/ui/components/separator'
    import { Textarea } from '@hyperion/ui/components/textarea'
    import {
        getLocalTimeZone,
        today,
        type DateValue,
    } from '@internationalized/date'
    import CalendarIcon from '@lucide/svelte/icons/calendar'
    import CheckIcon from '@lucide/svelte/icons/check'
    import ClockIcon from '@lucide/svelte/icons/clock'
    import CopyIcon from '@lucide/svelte/icons/copy'
    import ImageIcon from '@lucide/svelte/icons/image'
    import InfoIcon from '@lucide/svelte/icons/info'
    import SmartphoneIcon from '@lucide/svelte/icons/smartphone'
    import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
    import UploadIcon from '@lucide/svelte/icons/upload'
    import XIcon from '@lucide/svelte/icons/x'
    import { createMutation } from '@tanstack/svelte-query'
    import { toast } from 'svelte-sonner'

    import { PUBLIC_API_URL } from '$env/static/public'
    import { orderClient } from '$lib/clients'
    import { getCookie } from '$lib/utilities/helpers'
    import type { TCartItem } from '../types.js'

    ////////////////////
    // 01. Properties //
    ////////////////////

    type TDeliveryType = 'self_pickup' | 'lalamove' | 'other_courier'

    let {
        open = $bindable(false),
        cart,
        onOrderSuccess,
    }: {
        open: boolean
        cart: TCartItem[]
        onOrderSuccess: () => void
    } = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const DELIVERY_TYPE_LABELS: Record<TDeliveryType, string> = {
        self_pickup: 'Self Pickup',
        lalamove: 'Lalamove',
        other_courier: 'Other Courier',
    }

    const DELIVERY_OPTIONS: { value: TDeliveryType; label: string }[] = [
        { value: 'self_pickup', label: 'Self Pickup' },
        { value: 'lalamove', label: 'Lalamove' },
        { value: 'other_courier', label: 'Other Courier' },
    ]

    const GCASH_ACCOUNT_NAME = 'Cosina Home Cooking'
    const GCASH_NUMBER = '0917-450-5619'

    ///////////////
    // 03. State //
    ///////////////

    let customerName = $state('')
    let contactNumber = $state('')
    let contactNumber2 = $state('')
    let deliveryType = $state<TDeliveryType>('self_pickup')
    let deliveryDate = $state<DateValue | undefined>(undefined)
    let deliveryTime = $state('12:00')
    let deliveryPickerOpen = $state(false)
    let downpayment = $state('')
    let notes = $state('')
    let proofOfPayment = $state<File | null>(null)
    let proofPreviewUrl = $state<string | null>(null)
    let gcashCopied = $state(false)
    // Success screen state
    let placedOrderCode = $state<string | null>(null)
    let orderCodeCopied = $state(false)

    /////////////////
    // 04. Derived //
    /////////////////

    const orderTotal = $derived(
        cart.reduce(
            (sum, item) => sum + parseFloat(item.price) * item.quantity,
            0,
        ),
    )

    const minDownpayment = $derived(orderTotal * 0.5)

    // Earliest selectable delivery date: today + 3 days (at least 2 full days advance)
    const minDeliveryDate = $derived(today(getLocalTimeZone()).add({ days: 3 }))

    const deliveryDateLabel = $derived(
        deliveryDate
            ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(
                  deliveryDate.toDate(getLocalTimeZone()),
              )
            : 'Pick a delivery date',
    )

    // Combine date + time into an ISO string for the API
    const deliveryAt = $derived.by<string | undefined>(() => {
        if (!deliveryDate) return undefined
        const [
            h,
            m,
        ] = deliveryTime.split(':').map(Number)
        const d = deliveryDate.toDate(getLocalTimeZone())
        d.setHours(h, m, 0, 0)
        return d.toISOString()
    })

    const isFormValid = $derived(
        customerName.trim().length > 0 &&
            contactNumber.trim().length > 0 &&
            !!deliveryDate,
    )

    ///////////////////
    // 06. Mutations //
    ///////////////////

    const createOrderMutation = createMutation(() => ({
        mutationKey: [
            'order',
            'create',
        ],
        mutationFn: async () => {
            let proofOfPaymentObjectStorageId: string | undefined

            if (proofOfPayment) {
                const formData = new FormData()
                formData.append('file', proofOfPayment)

                const csrfToken = getCookie('csrf_token')
                const uploadHeaders: Record<string, string> = {}
                if (csrfToken) {
                    uploadHeaders['x-csrf-token'] =
                        decodeURIComponent(csrfToken)
                }

                const uploadRes = await fetch(
                    `${PUBLIC_API_URL}/api/order/proof/upload`,
                    {
                        method: 'POST',
                        body: formData,
                        headers: uploadHeaders,
                        credentials: 'include',
                    },
                )
                const uploadJson = (await uploadRes.json()) as {
                    success: boolean
                    data?: { objectStorageId: string }
                    error?: { message: string }
                }

                if (!uploadJson.success) {
                    throw new Error(
                        uploadJson.error?.message ??
                            'Proof of payment upload failed.',
                    )
                }

                proofOfPaymentObjectStorageId = uploadJson.data?.objectStorageId
            }

            const response = await orderClient.create.$post({
                json: {
                    customerName: customerName.trim(),
                    contactNumber: contactNumber.trim(),
                    contactNumber2: contactNumber2.trim() || undefined,
                    deliveryType,
                    deliveryAt,
                    downpayment: downpayment || undefined,
                    proofOfPaymentObjectStorageId,
                    notes: notes.trim() || undefined,
                    items: cart.map((item) => ({
                        productId: item.productId,
                        name: item.name,
                        sizeName: item.sizeName,
                        quantity: item.quantity,
                        price: item.price,
                    })),
                },
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data
        },
        onSuccess: (data) => {
            onOrderSuccess()
            placedOrderCode = data.trackingCode
            resetForm()
        },
        onError: (err: Error) => {
            toast.error('Failed to place order', {
                description: err.message,
            })
        },
    }))

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        const file = proofOfPayment
        if (file) {
            const url = URL.createObjectURL(file)
            proofPreviewUrl = url
            return () => URL.revokeObjectURL(url)
        } else {
            proofPreviewUrl = null
        }
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault()
        e.stopPropagation()
        if (!isFormValid || cart.length === 0) return
        createOrderMutation.mutate()
    }

    function handleProofFileChange(e: Event) {
        const input = e.currentTarget as HTMLInputElement
        proofOfPayment = input.files?.[0] ?? null
    }

    function clearProofFile() {
        proofOfPayment = null
    }

    async function copyGcashNumber() {
        await navigator.clipboard.writeText(GCASH_NUMBER.replace(/-/g, ''))
        gcashCopied = true
        setTimeout(() => (gcashCopied = false), 2000)
    }

    async function copyOrderCode() {
        if (!placedOrderCode) return
        await navigator.clipboard.writeText(placedOrderCode)
        orderCodeCopied = true
        setTimeout(() => (orderCodeCopied = false), 2500)
    }

    function closeSuccessScreen() {
        open = false
        placedOrderCode = null
        orderCodeCopied = false
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function isDateDisabled(date: DateValue): boolean {
        return date.compare(minDeliveryDate) < 0
    }

    function resetForm() {
        customerName = ''
        contactNumber = ''
        contactNumber2 = ''
        deliveryType = 'self_pickup'
        deliveryDate = undefined
        deliveryTime = '12:00'
        downpayment = ''
        notes = ''
        proofOfPayment = null
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content
        class="flex max-h-[90dvh] w-full max-w-lg flex-col gap-0 border-zinc-800 bg-zinc-950 p-0 sm:max-w-lg"
    >
        {#if placedOrderCode !== null}
            <!-- ── Success screen ── -->
            <div
                class="flex flex-col items-center gap-6 px-6 py-10 text-center"
            >
                <!-- Checkmark -->
                <div
                    class="flex size-16 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-500/20"
                >
                    <CheckIcon class="size-8 text-emerald-400" />
                </div>

                <div class="flex flex-col gap-1.5">
                    <h2 class="text-xl font-bold text-zinc-100">
                        Order Placed Successfully!
                    </h2>
                    <p class="text-sm text-zinc-400">
                        Your order has been received. Please
                        <span class="font-semibold text-zinc-200"
                            >copy your Tracking Code</span
                        >
                        — you'll need it to check your order status.
                    </p>
                </div>

                <!-- Tracking Code box -->
                <div
                    class="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-5"
                >
                    <p
                        class="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-500"
                    >
                        Your Tracking Code
                    </p>
                    <p
                        class="font-mono text-3xl font-black tracking-widest text-zinc-100"
                    >
                        {placedOrderCode}
                    </p>
                    <p class="mt-1 text-xs text-zinc-600">
                        Save this code to track your order
                    </p>

                    <button
                        type="button"
                        onclick={copyOrderCode}
                        class="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all
                            {orderCodeCopied
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                            : 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:border-blue-500/40 hover:text-zinc-100'}"
                    >
                        {#if orderCodeCopied}
                            <CheckIcon class="size-4" />
                            Copied!
                        {:else}
                            <CopyIcon class="size-4" />
                            Copy Tracking Code
                        {/if}
                    </button>
                </div>

                <!-- Track link -->
                <a
                    href="/track?code={placedOrderCode}"
                    class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                    onclick={closeSuccessScreen}
                >
                    View Order Status
                </a>

                <button
                    type="button"
                    onclick={closeSuccessScreen}
                    class="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
                >
                    Back to Menu
                </button>
            </div>
        {:else}
            <!-- ── Order form ── -->
            <Dialog.Header class="border-b border-zinc-800 px-6 py-5">
                <Dialog.Title class="text-lg font-semibold text-zinc-100">
                    Complete Your Order
                </Dialog.Title>
                <Dialog.Description class="text-sm text-zinc-500">
                    Fill in your details to place the order.
                </Dialog.Description>
            </Dialog.Header>

            <div class="flex-1 overflow-y-auto">
                <form
                    id="order-form"
                    onsubmit={handleSubmit}
                    class="flex flex-col gap-5 px-6 py-5"
                >
                    <!-- Customer Details -->
                    <div class="flex flex-col gap-4">
                        <h3 class="text-sm font-semibold text-zinc-300">
                            Contact Details
                        </h3>

                        <div class="flex flex-col gap-1.5">
                            <Label
                                for="customerName"
                                class="text-xs font-medium text-zinc-400"
                            >
                                Full Name <span class="text-red-400">*</span>
                            </Label>
                            <Input
                                id="customerName"
                                bind:value={customerName}
                                placeholder="Juan dela Cruz"
                                required
                                class="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500/50"
                            />
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="flex flex-col gap-1.5">
                                <Label
                                    for="contactNumber"
                                    class="text-xs font-medium text-zinc-400"
                                >
                                    Contact Number <span class="text-red-400"
                                        >*</span
                                    >
                                </Label>
                                <Input
                                    id="contactNumber"
                                    bind:value={contactNumber}
                                    placeholder="09XX XXX XXXX"
                                    required
                                    type="tel"
                                    class="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500/50"
                                />
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <Label
                                    for="contactNumber2"
                                    class="text-xs font-medium text-zinc-400"
                                >
                                    Alt. Number
                                </Label>
                                <Input
                                    id="contactNumber2"
                                    bind:value={contactNumber2}
                                    placeholder="Optional"
                                    type="tel"
                                    class="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500/50"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator class="bg-zinc-800" />

                    <!-- Delivery Details -->
                    <div class="flex flex-col gap-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-sm font-semibold text-zinc-300">
                                Delivery Details
                            </h3>
                        </div>

                        <!-- Advance Order Notice -->
                        <div
                            class="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-3"
                        >
                            <InfoIcon
                                class="mt-0.5 h-4 w-4 shrink-0 text-amber-400"
                            />
                            <div class="flex flex-col gap-0.5">
                                <p class="text-xs font-semibold text-amber-300">
                                    Advance Order Only
                                </p>
                                <p
                                    class="text-xs leading-relaxed text-amber-300/80"
                                >
                                    Orders must be placed at least <span
                                        class="font-semibold text-amber-200"
                                        >2 days in advance</span
                                    >. The earliest available delivery date is
                                    shown in the calendar.
                                </p>
                            </div>
                        </div>

                        <!-- Delivery Date + Time -->
                        <div class="flex flex-col gap-3">
                            <div class="flex flex-col gap-1.5">
                                <Label
                                    class="text-xs font-medium text-zinc-400"
                                >
                                    Delivery Date <span class="text-red-400"
                                        >*</span
                                    >
                                </Label>
                                <Popover.Root bind:open={deliveryPickerOpen}>
                                    <Popover.Trigger>
                                        {#snippet child({ props })}
                                            <button
                                                {...props}
                                                type="button"
                                                class="flex h-10 w-full items-center gap-2.5 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-left text-sm transition-colors hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                                                {deliveryDate
                                                    ? 'text-zinc-100'
                                                    : 'text-zinc-500'}"
                                            >
                                                <CalendarIcon
                                                    class="h-4 w-4 shrink-0 text-zinc-500"
                                                />
                                                {deliveryDateLabel}
                                            </button>
                                        {/snippet}
                                    </Popover.Trigger>
                                    <Popover.Content
                                        class="w-auto border-zinc-800 bg-zinc-950 p-0"
                                        align="start"
                                    >
                                        <Calendar.Calendar
                                            type="single"
                                            bind:value={deliveryDate}
                                            {isDateDisabled}
                                            onValueChange={() =>
                                                (deliveryPickerOpen = false)}
                                            class="rounded-xl border-0"
                                        />
                                    </Popover.Content>
                                </Popover.Root>
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <Label
                                    for="deliveryTime"
                                    class="text-xs font-medium text-zinc-400"
                                >
                                    Preferred Time <span class="text-red-400"
                                        >*</span
                                    >
                                </Label>
                                <div class="relative">
                                    <ClockIcon
                                        class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500"
                                    />
                                    <Input
                                        id="deliveryTime"
                                        type="time"
                                        bind:value={deliveryTime}
                                        class="border-zinc-800 bg-zinc-900 pl-9 text-zinc-100 focus-visible:ring-blue-500/50"
                                    />
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col gap-1.5">
                            <Label class="text-xs font-medium text-zinc-400">
                                Delivery Type <span class="text-red-400">*</span
                                >
                            </Label>
                            <Select.Root
                                type="single"
                                value={deliveryType}
                                onValueChange={(v: string | undefined) =>
                                    (deliveryType =
                                        (v as TDeliveryType) ?? deliveryType)}
                            >
                                <Select.Trigger
                                    class="border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 focus:ring-blue-500/50"
                                >
                                    {DELIVERY_TYPE_LABELS[deliveryType]}
                                </Select.Trigger>
                                <Select.Content
                                    class="border-zinc-700 bg-zinc-900"
                                >
                                    {#each DELIVERY_OPTIONS as opt (opt.value)}
                                        <Select.Item
                                            value={opt.value}
                                            class="text-zinc-100 focus:bg-zinc-800 focus:text-zinc-100"
                                        >
                                            {opt.label}
                                        </Select.Item>
                                    {/each}
                                </Select.Content>
                            </Select.Root>
                        </div>

                        <!-- GCash Payment Details -->
                        <div
                            class="overflow-hidden rounded-xl border border-blue-500/30 bg-blue-500/5"
                        >
                            <div
                                class="flex items-center gap-2.5 border-b border-blue-500/20 px-4 py-3"
                            >
                                <div
                                    class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20"
                                >
                                    <SmartphoneIcon
                                        class="h-4 w-4 text-blue-400"
                                    />
                                </div>
                                <span
                                    class="text-sm font-semibold text-blue-300"
                                >
                                    Send Payment via GCash
                                </span>
                            </div>
                            <div class="flex flex-col gap-2.5 px-4 py-3">
                                <div
                                    class="flex items-center justify-between gap-2"
                                >
                                    <span class="text-xs text-zinc-500"
                                        >Account Name</span
                                    >
                                    <span
                                        class="text-sm font-medium text-zinc-200"
                                    >
                                        {GCASH_ACCOUNT_NAME}
                                    </span>
                                </div>
                                <div
                                    class="flex items-center justify-between gap-2"
                                >
                                    <span class="text-xs text-zinc-500"
                                        >GCash Number</span
                                    >
                                    <div class="flex items-center gap-2">
                                        <span
                                            class="font-mono text-sm font-semibold tracking-wide text-zinc-100"
                                        >
                                            {GCASH_NUMBER}
                                        </span>
                                        <button
                                            type="button"
                                            onclick={copyGcashNumber}
                                            class="flex h-6 w-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                                            aria-label="Copy GCash number"
                                        >
                                            {#if gcashCopied}
                                                <CheckIcon
                                                    class="h-3.5 w-3.5 text-green-400"
                                                />
                                            {:else}
                                                <CopyIcon class="h-3.5 w-3.5" />
                                            {/if}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Downpayment -->
                        <div class="flex flex-col gap-1.5">
                            <Label
                                for="downpayment"
                                class="text-xs font-medium text-zinc-400"
                            >
                                Downpayment (₱)
                            </Label>
                            <div
                                class="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2"
                            >
                                <TriangleAlertIcon
                                    class="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400"
                                />
                                <p
                                    class="text-xs leading-relaxed text-amber-300"
                                >
                                    <span class="font-semibold">Note:</span>
                                    Please make a downpayment of at least
                                    <span class="font-semibold text-amber-200">
                                        50%
                                        {#if orderTotal > 0}
                                            (₱{minDownpayment.toLocaleString(
                                                'en-PH',
                                                { minimumFractionDigits: 2 },
                                            )})
                                        {/if}
                                    </span>
                                    to proceed with your order. Also No Proof Of Payment,
                                    Automatic Cancel. Thank you for your understanding.
                                </p>
                            </div>
                            <Input
                                id="downpayment"
                                bind:value={downpayment}
                                placeholder="0.00"
                                type="number"
                                min="0"
                                step="0.01"
                                class="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500/50"
                            />
                        </div>

                        <!-- Proof of Payment Upload -->
                        <div class="flex flex-col gap-1.5">
                            <Label class="text-xs font-medium text-zinc-400">
                                Proof of Payment
                            </Label>
                            {#if proofPreviewUrl}
                                <div
                                    class="relative overflow-hidden rounded-xl border border-zinc-700"
                                >
                                    <img
                                        src={proofPreviewUrl}
                                        alt="Proof of payment preview"
                                        class="max-h-48 w-full object-contain bg-zinc-900"
                                    />
                                    <button
                                        type="button"
                                        onclick={clearProofFile}
                                        class="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/80 text-zinc-300 backdrop-blur-sm transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                                        aria-label="Remove image"
                                    >
                                        <XIcon class="h-4 w-4" />
                                    </button>
                                    <div
                                        class="border-t border-zinc-800 bg-zinc-900/80 px-3 py-1.5"
                                    >
                                        <p
                                            class="truncate text-xs text-zinc-500"
                                        >
                                            {proofOfPayment?.name}
                                        </p>
                                    </div>
                                </div>
                            {:else}
                                <label
                                    for="proofOfPayment"
                                    class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/50 px-4 py-6 text-center transition-colors hover:border-zinc-600 hover:bg-zinc-900"
                                >
                                    <div
                                        class="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800"
                                    >
                                        <ImageIcon
                                            class="h-5 w-5 text-zinc-500"
                                        />
                                    </div>
                                    <div>
                                        <p
                                            class="flex items-center gap-1.5 text-sm font-medium text-zinc-300"
                                        >
                                            <UploadIcon class="h-3.5 w-3.5" />
                                            Upload screenshot
                                        </p>
                                        <p class="mt-0.5 text-xs text-zinc-600">
                                            PNG, JPG or WEBP up to 10 MB
                                        </p>
                                    </div>
                                    <input
                                        id="proofOfPayment"
                                        type="file"
                                        accept="image/*"
                                        class="sr-only"
                                        onchange={handleProofFileChange}
                                    />
                                </label>
                            {/if}
                        </div>

                        <div class="flex flex-col gap-1.5">
                            <Label
                                for="notes"
                                class="text-xs font-medium text-zinc-400"
                            >
                                Special Instructions
                            </Label>
                            <Textarea
                                id="notes"
                                bind:value={notes}
                                placeholder="Any special requests or notes for your order..."
                                rows={3}
                                class="resize-none border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500/50"
                            />
                        </div>
                    </div>

                    <Separator class="bg-zinc-800" />

                    <!-- Order Summary -->
                    <div class="flex flex-col gap-3">
                        <h3 class="text-sm font-semibold text-zinc-300">
                            Order Summary
                        </h3>
                        <ul class="flex flex-col gap-2">
                            {#each cart as item (item.key)}
                                <li
                                    class="flex items-start justify-between gap-3"
                                >
                                    <div class="flex-1 min-w-0">
                                        <p
                                            class="text-sm text-zinc-300 truncate"
                                        >
                                            {item.name}
                                            {#if item.sizeName}
                                                <span class="text-zinc-500"
                                                    >({item.sizeName})</span
                                                >
                                            {/if}
                                        </p>
                                        <p class="text-xs text-zinc-600">
                                            {item.quantity} × ₱{Number(
                                                item.price,
                                            ).toLocaleString('en-PH', {
                                                minimumFractionDigits: 2,
                                            })}
                                        </p>
                                    </div>
                                    <span
                                        class="shrink-0 text-sm font-medium text-zinc-200"
                                    >
                                        ₱{(
                                            parseFloat(item.price) *
                                            item.quantity
                                        ).toLocaleString('en-PH', {
                                            minimumFractionDigits: 2,
                                        })}
                                    </span>
                                </li>
                            {/each}
                        </ul>
                        <Separator class="bg-zinc-800" />
                        <div class="flex items-center justify-between">
                            <span class="text-sm font-semibold text-zinc-300"
                                >Total</span
                            >
                            <span class="text-lg font-bold text-blue-400">
                                ₱{orderTotal.toLocaleString('en-PH', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                    </div>
                </form>
            </div>

            <Dialog.Footer class="border-t border-zinc-800 px-6 py-4">
                <Button
                    variant="ghost"
                    onclick={() => (open = false)}
                    class="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                    disabled={createOrderMutation.isPending}
                >
                    Cancel
                </Button>
                <Button
                    form="order-form"
                    type="submit"
                    disabled={!isFormValid ||
                        cart.length === 0 ||
                        createOrderMutation.isPending}
                    class="bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {#if createOrderMutation.isPending}
                        {proofOfPayment
                            ? 'Uploading & Placing Order...'
                            : 'Placing Order...'}
                    {:else}
                        Confirm Order
                    {/if}
                </Button>
            </Dialog.Footer>
        {/if}
    </Dialog.Content>
</Dialog.Root>
