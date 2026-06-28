<script lang="ts">
    import { Button } from '@cosina/ui/components/button'
    import * as Calendar from '@cosina/ui/components/calendar'
    import * as Dialog from '@cosina/ui/components/dialog'
    import { Input } from '@cosina/ui/components/input'
    import { Label } from '@cosina/ui/components/label'
    import * as Popover from '@cosina/ui/components/popover'
    import * as Select from '@cosina/ui/components/select'
    import { Textarea } from '@cosina/ui/components/textarea'
    import {
        getLocalTimeZone,
        today,
        type DateValue,
    } from '@internationalized/date'
    import BanknoteIcon from '@lucide/svelte/icons/banknote'
    import CalendarIcon from '@lucide/svelte/icons/calendar'
    import CheckIcon from '@lucide/svelte/icons/check'
    import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
    import ClockIcon from '@lucide/svelte/icons/clock'
    import CopyIcon from '@lucide/svelte/icons/copy'
    import InfoIcon from '@lucide/svelte/icons/info'
    import MapPinIcon from '@lucide/svelte/icons/map-pin'
    import SmartphoneIcon from '@lucide/svelte/icons/smartphone'
    import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert'
    import { createMutation } from '@tanstack/svelte-query'
    import { toast } from 'svelte-sonner'

    import { orderClient } from '$lib/clients'
    import ProofImageUploader from '$lib/components/upload/ProofImageUploader.svelte'
    import type { TCartItem } from '../types.js'

    ////////////////////
    // 01. Properties //
    ////////////////////

    type TDeliveryType = 'self_pickup' | 'lalamove' | 'other_courier'

    type TClosingDayItem = {
        id: string
        startDate: string
        endDate: string
        reason?: string
    }

    let {
        open = $bindable(false),
        cart,
        onOrderSuccess,
        advanceDays = 3,
        restaurantAddress = null,
        closingDays = [],
        settingsLoading = false,
        gcashAccountName = null,
        gcashNumber = null,
    }: {
        open: boolean
        cart: TCartItem[]
        onOrderSuccess: () => void
        advanceDays?: number
        restaurantAddress?: string | null
        closingDays?: TClosingDayItem[]
        settingsLoading?: boolean
        gcashAccountName?: string | null
        gcashNumber?: string | null
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

    const GCASH_ACCOUNT_NAME = $derived(
        gcashAccountName ?? 'Cosina Home Cooking',
    )
    const GCASH_NUMBER = $derived(gcashNumber ?? '0917-450-5619')

    const STEPS: { num: number; label: string }[] = [
        { num: 1, label: 'Contact' },
        { num: 2, label: 'Delivery' },
        { num: 3, label: 'Payment' },
    ]

    ///////////////
    // 03. State //
    ///////////////

    let currentStep = $state(1)

    let customerName = $state('')
    let contactNumber = $state('')
    let contactNumber2 = $state('')
    let deliveryType = $state<TDeliveryType>('self_pickup')
    let deliveryDate = $state<DateValue | undefined>(undefined)
    let deliveryTime = $state('12:00')
    let deliveryPickerOpen = $state(false)
    let deliveryAddress = $state('')
    let downpayment = $state('')
    let notes = $state('')
    let proofObjectStorageId = $state<string | null>(null)
    let proofUploading = $state(false)
    let gcashCopied = $state(false)
    // Success screen state
    let placedOrderCode = $state<string | null>(null)
    let placedOrderTotal = $state<number | null>(null)
    let placedOrderDownpayment = $state<number | null>(null)
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

    const minDeliveryDate = $derived(
        today(getLocalTimeZone()).add({ days: advanceDays }),
    )

    const deliveryDateLabel = $derived(
        deliveryDate
            ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(
                  deliveryDate.toDate(getLocalTimeZone()),
              )
            : 'Pick a delivery date',
    )

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

    const isDelivery = $derived(
        deliveryType === 'lalamove' || deliveryType === 'other_courier',
    )

    const step1Valid = $derived(
        customerName.trim().length > 0 && contactNumber.trim().length > 0,
    )

    const step2Valid = $derived(
        !!deliveryDate && (!isDelivery || deliveryAddress.trim().length > 0),
    )

    const step3Valid = $derived(
        proofObjectStorageId !== null &&
            !proofUploading &&
            Number(downpayment) > 0,
    )

    const isFormValid = $derived(step1Valid && step2Valid && step3Valid)

    ///////////////////
    // 06. Mutations //
    ///////////////////

    const createOrderMutation = createMutation(() => ({
        mutationKey: [
            'order',
            'create',
        ],
        mutationFn: async () => {
            const response = await orderClient.create.$post({
                json: {
                    customerName: customerName.trim(),
                    contactNumber: contactNumber.trim(),
                    contactNumber2: contactNumber2.trim() || undefined,
                    deliveryType,
                    deliveryAt,
                    downpayment: downpayment || undefined,
                    proofOfPaymentObjectStorageId:
                        proofObjectStorageId ?? undefined,
                    notes: notes.trim() || undefined,
                    deliveryAddress: deliveryAddress.trim() || undefined,
                    items: cart.map((item) => ({
                        productId: item.productId,
                        name: item.name,
                        sizeName: item.sizeName,
                        flavorName: item.flavorName,
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
            placedOrderTotal = parseFloat(data.amountToPay)
            placedOrderDownpayment =
                data.downpayment !== null ? parseFloat(data.downpayment) : null
            resetForm()
        },
        onError: (err: Error) => {
            toast.error('Failed to place order', { description: err.message })
        },
    }))

    /////////////////
    // 08. Effects //
    /////////////////

    //////////////////
    // 09. Handlers //
    //////////////////

    function goNext() {
        if (currentStep < STEPS.length) currentStep++
    }

    function goBack() {
        if (currentStep > 1) currentStep--
    }

    function handleConfirm() {
        if (!isFormValid || cart.length === 0) return
        createOrderMutation.mutate()
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
        placedOrderTotal = null
        placedOrderDownpayment = null
        orderCodeCopied = false
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function isDateDisabled(date: DateValue): boolean {
        if (date.compare(minDeliveryDate) < 0) return true
        // Disable dates that fall within any closing day range
        const dateStr = date.toString() // YYYY-MM-DD
        for (const range of closingDays) {
            if (dateStr >= range.startDate && dateStr <= range.endDate)
                return true
        }
        return false
    }

    function formatClosingRangeLabel(
        startDate: string,
        endDate: string,
    ): string {
        const fmt = (s: string) => {
            const [
                y,
                m,
                d,
            ] = s.split('-').map(Number)
            return new Intl.DateTimeFormat('en-PH', {
                dateStyle: 'medium',
            }).format(new Date(y, m - 1, d))
        }
        return startDate === endDate
            ? fmt(startDate)
            : `${fmt(startDate)} – ${fmt(endDate)}`
    }

    function resetForm() {
        customerName = ''
        contactNumber = ''
        contactNumber2 = ''
        deliveryType = 'self_pickup'
        deliveryAddress = ''
        deliveryDate = undefined
        deliveryTime = '12:00'
        downpayment = ''
        notes = ''
        proofObjectStorageId = null
        currentStep = 1
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

                {#if placedOrderTotal !== null && placedOrderDownpayment !== null && placedOrderDownpayment < placedOrderTotal}
                    {@const remaining =
                        placedOrderTotal - placedOrderDownpayment}
                    <div
                        class="w-full rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4"
                    >
                        <div class="flex items-start gap-3">
                            <div
                                class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15"
                            >
                                <BanknoteIcon class="size-4 text-amber-400" />
                            </div>
                            <div class="flex flex-col gap-1 text-left">
                                <p class="text-sm font-semibold text-amber-300">
                                    Remaining Balance Due
                                </p>
                                <p class="text-xs/relaxed text-amber-300/70">
                                    You paid a downpayment of
                                    <span class="font-semibold text-amber-200">
                                        {new Intl.NumberFormat('en-PH', {
                                            style: 'currency',
                                            currency: 'PHP',
                                        }).format(placedOrderDownpayment)}
                                    </span>. The remaining
                                    <span class="font-semibold text-amber-200">
                                        {new Intl.NumberFormat('en-PH', {
                                            style: 'currency',
                                            currency: 'PHP',
                                        }).format(remaining)}
                                    </span>
                                    can be settled via GCash or cash on pickup — use
                                    your tracking page to pay.
                                </p>
                            </div>
                        </div>
                    </div>
                {/if}

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
            <Dialog.Header class="border-b border-zinc-800 px-6 py-4">
                <Dialog.Title class="text-lg font-semibold text-zinc-100">
                    Place Your Order
                </Dialog.Title>
                <Dialog.Description class="sr-only">
                    Complete your order in {STEPS.length} steps.
                </Dialog.Description>
            </Dialog.Header>

            <!-- Step indicator -->
            <div
                class="flex items-center gap-0 border-b border-zinc-800 px-6 py-3"
            >
                {#each STEPS as step, i (step.num)}
                    {#if i > 0}
                        <div
                            class="mx-2 h-px flex-1 transition-colors {currentStep >
                            i
                                ? 'bg-blue-500'
                                : 'bg-zinc-800'}"
                        ></div>
                    {/if}
                    <button
                        type="button"
                        class="flex items-center gap-2 disabled:cursor-default"
                        disabled={step.num > currentStep}
                        onclick={() => {
                            if (step.num < currentStep) currentStep = step.num
                        }}
                    >
                        <div
                            class="flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors
                                {currentStep > step.num
                                ? 'bg-blue-500 text-white'
                                : currentStep === step.num
                                  ? 'bg-blue-600 text-white ring-2 ring-blue-500/30'
                                  : 'bg-zinc-800 text-zinc-500'}"
                        >
                            {#if currentStep > step.num}
                                <CheckIcon class="size-3 " />
                            {:else}
                                {step.num}
                            {/if}
                        </div>
                        <span
                            class="text-xs font-medium transition-colors {currentStep ===
                            step.num
                                ? 'text-zinc-100'
                                : currentStep > step.num
                                  ? 'text-blue-400'
                                  : 'text-zinc-600'}"
                        >
                            {step.label}
                        </span>
                    </button>
                {/each}
            </div>

            {#if createOrderMutation.isPending}
                <div
                    class="flex flex-1 flex-col items-center justify-center gap-4 py-12"
                >
                    <div
                        class="size-9 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-400"
                    ></div>
                    <p class="text-sm font-medium text-zinc-300">
                        Placing your order…
                    </p>
                </div>
            {:else}
                <div class="min-h-0 flex-1 overflow-y-auto">
                    <div class="flex flex-col gap-5 px-6 py-5">
                        <!-- ── Step 1: Contact ── -->
                        {#if currentStep === 1}
                            <div class="flex flex-col gap-1 pb-1">
                                <h3
                                    class="text-base font-semibold text-zinc-100"
                                >
                                    Contact Details
                                </h3>
                                <p class="text-xs text-zinc-500">
                                    We'll use this to coordinate your order.
                                </p>
                            </div>

                            <div class="flex flex-col gap-1.5">
                                <Label
                                    for="customerName"
                                    class="text-xs font-medium text-zinc-400"
                                >
                                    Full Name <span class="text-red-400">*</span
                                    >
                                </Label>
                                <Input
                                    id="customerName"
                                    bind:value={customerName}
                                    placeholder="Juan dela Cruz"
                                    required
                                    class="border-zinc-800 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-blue-500/50"
                                />
                            </div>

                            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div class="flex flex-col gap-1.5">
                                    <Label
                                        for="contactNumber"
                                        class="text-xs font-medium text-zinc-400"
                                    >
                                        Contact Number <span
                                            class="text-red-400">*</span
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
                        {/if}

                        <!-- ── Step 2: Delivery ── -->
                        {#if currentStep === 2}
                            <div class="flex flex-col gap-1 pb-1">
                                <h3
                                    class="text-base font-semibold text-zinc-100"
                                >
                                    Delivery Details
                                </h3>
                                <p class="text-xs text-zinc-500">
                                    Choose how and when you'd like to receive
                                    your order.
                                </p>
                            </div>

                            <!-- Advance Order Notice -->
                            {#if settingsLoading}
                                <div
                                    class="flex items-start gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-3"
                                >
                                    <div
                                        class="mt-0.5 size-4 shrink-0 animate-pulse rounded-sm bg-zinc-700"
                                    ></div>
                                    <div class="flex flex-1 flex-col gap-2">
                                        <div
                                            class="h-3 w-1/3 animate-pulse rounded-sm bg-zinc-700"
                                        ></div>
                                        <div
                                            class="h-3 w-full animate-pulse rounded-sm bg-zinc-700"
                                        ></div>
                                        <div
                                            class="h-3 w-4/5 animate-pulse rounded-sm bg-zinc-700"
                                        ></div>
                                    </div>
                                </div>
                            {:else}
                                <div
                                    class="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-3"
                                >
                                    <InfoIcon
                                        class="mt-0.5 size-4  shrink-0 text-amber-400"
                                    />
                                    <div class="flex flex-col gap-0.5">
                                        <p
                                            class="text-xs font-semibold text-amber-300"
                                        >
                                            Advance Order Only
                                        </p>
                                        <p
                                            class="text-xs/relaxed text-amber-300/80"
                                        >
                                            Orders must be placed at least
                                            <span
                                                class="font-semibold text-amber-200"
                                                >{advanceDays}
                                                {advanceDays === 1
                                                    ? 'day'
                                                    : 'days'} in advance</span
                                            >. The earliest available date is
                                            shown in the calendar.
                                        </p>
                                    </div>
                                </div>
                            {/if}

                            <!-- Delivery Type -->
                            <div class="flex flex-col gap-1.5">
                                <Label
                                    class="text-xs font-medium text-zinc-400"
                                >
                                    Delivery Type <span class="text-red-400"
                                        >*</span
                                    >
                                </Label>
                                <Select.Root
                                    type="single"
                                    value={deliveryType}
                                    onValueChange={(v: string | undefined) =>
                                        (deliveryType =
                                            (v as TDeliveryType) ??
                                            deliveryType)}
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

                            <!-- Pickup address or Delivery address input -->
                            {#if deliveryType === 'self_pickup'}
                                <div
                                    class="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-900/60"
                                >
                                    <div
                                        class="flex items-center gap-2.5 border-b border-zinc-700/40 px-4 py-3"
                                    >
                                        <div
                                            class="flex size-7 items-center justify-center rounded-lg bg-zinc-700/60"
                                        >
                                            <MapPinIcon
                                                class="size-4  text-zinc-300"
                                            />
                                        </div>
                                        <span
                                            class="text-sm font-semibold text-zinc-200"
                                        >
                                            Pickup Address
                                        </span>
                                    </div>
                                    <div class="px-4 py-3">
                                        {#if restaurantAddress}
                                            <p
                                                class="text-sm/relaxed text-zinc-300"
                                            >
                                                {restaurantAddress}
                                            </p>
                                        {:else}
                                            <p
                                                class="text-sm italic text-zinc-500"
                                            >
                                                Please contact us for the pickup
                                                address.
                                            </p>
                                        {/if}
                                    </div>
                                </div>
                            {:else}
                                <div class="flex flex-col gap-1.5">
                                    <Label
                                        for="deliveryAddress"
                                        class="text-xs font-medium text-zinc-400"
                                    >
                                        Delivery Address <span
                                            class="text-red-400">*</span
                                        >
                                    </Label>
                                    <Textarea
                                        id="deliveryAddress"
                                        placeholder="Enter your complete delivery address"
                                        bind:value={deliveryAddress}
                                        rows={3}
                                        class="resize-none border-zinc-800 bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-600 focus:ring-blue-500/50"
                                    />
                                </div>
                            {/if}

                            <!-- Delivery Date + Time -->
                            <div class="grid grid-cols-2 gap-3">
                                <div class="flex flex-col gap-1.5">
                                    <Label
                                        class="text-xs font-medium text-zinc-400"
                                    >
                                        Delivery Date <span class="text-red-400"
                                            >*</span
                                        >
                                    </Label>
                                    <Popover.Root
                                        bind:open={deliveryPickerOpen}
                                    >
                                        <Popover.Trigger>
                                            {#snippet child({
                                                props,
                                            }: {
                                                props: Record<string, unknown>
                                            })}
                                                <button
                                                    {...props}
                                                    type="button"
                                                    class="flex h-10 w-full items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-left text-sm transition-colors hover:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50
                                                        {deliveryDate
                                                        ? 'text-zinc-100'
                                                        : 'text-zinc-500'}"
                                                >
                                                    <CalendarIcon
                                                        class="size-4  shrink-0 text-zinc-500"
                                                    />
                                                    <span class="truncate"
                                                        >{deliveryDateLabel}</span
                                                    >
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
                                        Preferred Time <span
                                            class="text-red-400">*</span
                                        >
                                    </Label>
                                    <div class="relative">
                                        <ClockIcon
                                            class="pointer-events-none absolute top-1/2 left-3 size-4  -translate-y-1/2 text-zinc-500"
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

                            <!-- Closing Days Notice -->
                            {#if closingDays.length > 0}
                                <div
                                    class="flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-3"
                                >
                                    <div class="flex items-center gap-2">
                                        <TriangleAlertIcon
                                            class="size-4  shrink-0 text-amber-400"
                                        />
                                        <p
                                            class="text-xs font-semibold text-amber-300"
                                        >
                                            Unavailable Delivery Dates
                                        </p>
                                    </div>
                                    <ul class="flex flex-col gap-1">
                                        {#each closingDays as range (range.id)}
                                            <li
                                                class="flex items-start gap-2 text-xs"
                                            >
                                                <span
                                                    class="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-500/60"
                                                ></span>
                                                <span class="text-zinc-300">
                                                    {formatClosingRangeLabel(
                                                        range.startDate,
                                                        range.endDate,
                                                    )}
                                                    {#if range.reason}
                                                        <span
                                                            class="text-zinc-500"
                                                        >
                                                            — {range.reason}
                                                        </span>
                                                    {/if}
                                                </span>
                                            </li>
                                        {/each}
                                    </ul>
                                    <p class="text-[11px] text-zinc-500">
                                        These dates are grayed out in the
                                        calendar.
                                    </p>
                                </div>
                            {/if}
                        {/if}

                        <!-- ── Step 3: Payment & Review ── -->
                        {#if currentStep === 3}
                            <div class="flex flex-col gap-1 pb-1">
                                <h3
                                    class="text-base font-semibold text-zinc-100"
                                >
                                    Payment & Review
                                </h3>
                                <p class="text-xs text-zinc-500">
                                    Review your order and complete the
                                    downpayment.
                                </p>
                            </div>

                            <!-- Order Summary -->
                            <div
                                class="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40"
                            >
                                <div class="border-b border-zinc-800 px-4 py-3">
                                    <p
                                        class="text-xs font-semibold uppercase tracking-wide text-zinc-400"
                                    >
                                        Order Summary
                                    </p>
                                </div>
                                <ul
                                    class="flex flex-col divide-y divide-zinc-800/60 px-4"
                                >
                                    {#each cart as item (item.key)}
                                        <li
                                            class="flex items-start justify-between gap-3 py-2.5"
                                        >
                                            <div class="min-w-0 flex-1">
                                                <p
                                                    class="truncate text-sm text-zinc-300"
                                                >
                                                    {item.name}
                                                    {#if item.flavorName || item.sizeName}
                                                        <span
                                                            class="text-zinc-500"
                                                        >
                                                            ({[
                                                                item.flavorName,
                                                                item.sizeName,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' · ')})
                                                        </span>
                                                    {/if}
                                                </p>
                                                <p
                                                    class="text-xs text-zinc-600"
                                                >
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
                                <div
                                    class="flex items-center justify-between border-t border-zinc-800 px-4 py-3"
                                >
                                    <span
                                        class="text-sm font-semibold text-zinc-300"
                                        >Total</span
                                    >
                                    <span
                                        class="text-lg font-bold text-blue-400"
                                    >
                                        ₱{orderTotal.toLocaleString('en-PH', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </span>
                                </div>
                            </div>

                            <!-- GCash info -->
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
                                            class="size-4  text-blue-400"
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
                                                class="flex size-6 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                                                aria-label="Copy GCash number"
                                            >
                                                {#if gcashCopied}
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
                                </div>
                            </div>

                            <!-- Downpayment -->
                            <div class="flex flex-col gap-1.5">
                                <Label
                                    for="downpayment"
                                    class="text-xs font-medium text-zinc-400"
                                >
                                    Downpayment (₱) <span class="text-red-400"
                                        >*</span
                                    >
                                </Label>
                                <div
                                    class="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2"
                                >
                                    <TriangleAlertIcon
                                        class="mt-0.5 size-3.5  shrink-0 text-amber-400"
                                    />
                                    <p class="text-xs/relaxed text-amber-300">
                                        <span class="font-semibold">Note:</span>
                                        Please make a downpayment of at least
                                        <span
                                            class="font-semibold text-amber-200"
                                        >
                                            50%
                                            {#if orderTotal > 0}
                                                (₱{minDownpayment.toLocaleString(
                                                    'en-PH',
                                                    {
                                                        minimumFractionDigits: 2,
                                                    },
                                                )})
                                            {/if}
                                        </span>
                                        to proceed. No Proof of Payment = Automatic
                                        Cancel.
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

                            <!-- Proof of Payment -->
                            <div class="flex flex-col gap-1.5">
                                <Label
                                    class="text-xs font-medium text-zinc-400"
                                >
                                    Proof of Payment <span class="text-red-400"
                                        >*</span
                                    >
                                </Label>
                                <ProofImageUploader
                                    bind:objectStorageId={proofObjectStorageId}
                                    bind:isUploading={proofUploading}
                                />
                            </div>

                            <!-- Special Instructions -->
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
                        {/if}
                    </div>
                </div>

                <!-- Footer navigation -->
                <div
                    class="flex items-center justify-between border-t border-zinc-800 bg-transparent px-6 py-4"
                >
                    {#if currentStep === 1}
                        <Button
                            variant="ghost"
                            onclick={() => (open = false)}
                            class="text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        >
                            Cancel
                        </Button>
                        <Button
                            onclick={goNext}
                            disabled={!step1Valid}
                            class="gap-1.5 bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                            <ChevronRightIcon class="size-4 " />
                        </Button>
                    {:else if currentStep === 2}
                        <Button
                            variant="ghost"
                            onclick={goBack}
                            class="gap-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        >
                            <ChevronLeftIcon class="size-4 " />
                            Back
                        </Button>
                        <Button
                            onclick={goNext}
                            disabled={!step2Valid}
                            class="gap-1.5 bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Next
                            <ChevronRightIcon class="size-4 " />
                        </Button>
                    {:else}
                        <Button
                            variant="ghost"
                            onclick={goBack}
                            class="gap-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
                        >
                            <ChevronLeftIcon class="size-4 " />
                            Back
                        </Button>
                        <Button
                            onclick={handleConfirm}
                            disabled={!isFormValid ||
                                cart.length === 0 ||
                                proofUploading ||
                                createOrderMutation.isPending}
                            class="bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Confirm Order
                        </Button>
                    {/if}
                </div>
            {/if}
        {/if}
    </Dialog.Content>
</Dialog.Root>
