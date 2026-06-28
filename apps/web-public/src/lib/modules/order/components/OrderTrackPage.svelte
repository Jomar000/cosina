<script lang="ts">
    import { Button } from '@cosina/ui/components/button'
    import * as Dialog from '@cosina/ui/components/dialog'
    import { Input } from '@cosina/ui/components/input'
    import { Separator } from '@cosina/ui/components/separator'
    import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left'
    import BanknoteIcon from '@lucide/svelte/icons/banknote'
    import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock'
    import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2'
    import CookingPotIcon from '@lucide/svelte/icons/cooking-pot'
    import CircleAlertIcon from '@lucide/svelte/icons/circle-alert'
    import CircleXIcon from '@lucide/svelte/icons/circle-x'
    import ClockIcon from '@lucide/svelte/icons/clock'
    import PackageCheckIcon from '@lucide/svelte/icons/package-check'
    import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
    import SearchIcon from '@lucide/svelte/icons/search'
    import ShieldCheckIcon from '@lucide/svelte/icons/shield-check'
    import TruckIcon from '@lucide/svelte/icons/truck'
    import WifiIcon from '@lucide/svelte/icons/wifi'
    import WifiOffIcon from '@lucide/svelte/icons/wifi-off'
    import {
        createMutation,
        createQuery,
        useQueryClient,
    } from '@tanstack/svelte-query'
    import { page } from '$app/state'
    import { toast } from 'svelte-sonner'

    import { orderClient } from '$lib/clients'
    import ProofImageUploader from '$lib/components/upload/ProofImageUploader.svelte'
    import { wsClientManager } from '$lib/utilities/wsClientManager'
    import PayRemainingBalanceDialog from './PayRemainingBalanceDialog.svelte'

    ///////////////////
    // 02. Constants //
    ///////////////////

    type TOrderStatus =
        | 'pending'
        | 'cooking'
        | 'looking_for_rider'
        | 'ready_to_pick_up'
        | 'rider_is_on_the_way'
        | 'completed'
        | 'cancelled'

    type TDeliveryType = 'self_pickup' | 'lalamove' | 'other_courier'

    type TProofStatus = 'received' | 'accepted' | 'fake' | null

    type TTrackedOrder = {
        id: number
        trackingCode: string
        customerName: string
        deliveryType: TDeliveryType
        deliveryAt: string | null
        downpayment: string | null
        amountToPay: string
        remainingBalancePaymentMethod: string | null
        proofOfPaymentObjectStorageId: string | null
        proofOfPaymentStatus: TProofStatus
        proofOfPaymentFakeReason: string | null
        remainingBalanceProofStatus: TProofStatus
        remainingBalanceProofFakeReason: string | null
        status: TOrderStatus
        notes: string | null
        createdAt: string
        items: {
            id: number
            name: string
            sizeName: string | null
            flavorName: string | null
            quantity: number
            price: string
        }[]
    }

    type TOrderSettings = {
        advanceDays: number
        restaurantAddress: string | null
        closingDays: unknown[]
        gcashAccountName: string | null
        gcashNumber: string | null
        paymentInstructions: string | null
    }

    const STATUS_LABELS: Record<TOrderStatus, string> = {
        pending: 'Order Received',
        cooking: 'Being Prepared',
        looking_for_rider: 'Looking for Rider',
        ready_to_pick_up: 'Ready to Pick Up',
        rider_is_on_the_way: 'Rider is on the Way',
        completed: 'Delivered',
        cancelled: 'Cancelled',
    }

    const STATUS_BADGE: Record<TOrderStatus, string> = {
        pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
        cooking: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        looking_for_rider: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        ready_to_pick_up:
            'bg-purple-500/15 text-purple-400 border-purple-500/30',
        rider_is_on_the_way:
            'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
        completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
    }

    const STATUS_DOT: Record<TOrderStatus, string> = {
        pending: 'bg-yellow-400',
        cooking: 'bg-orange-400',
        looking_for_rider: 'bg-blue-400',
        ready_to_pick_up: 'bg-purple-400',
        rider_is_on_the_way: 'bg-indigo-400',
        completed: 'bg-emerald-400',
        cancelled: 'bg-red-400',
    }

    const DELIVERY_TYPE_LABELS: Record<TDeliveryType, string> = {
        self_pickup: 'Self Pick-up',
        lalamove: 'Via Lalamove',
        other_courier: 'Other Courier',
    }

    const PROGRESS_STEPS: {
        status: TOrderStatus
        label: string
        Icon: typeof ClockIcon
    }[] = [
        { status: 'pending', label: 'Received', Icon: ClockIcon },
        { status: 'cooking', label: 'Preparing', Icon: CookingPotIcon },
        { status: 'ready_to_pick_up', label: 'Ready', Icon: PackageCheckIcon },
        { status: 'rider_is_on_the_way', label: 'On the Way', Icon: TruckIcon },
        { status: 'completed', label: 'Delivered', Icon: CheckCircle2Icon },
    ]

    const STATUS_STEP: Record<TOrderStatus, number> = {
        pending: 0,
        cooking: 1,
        looking_for_rider: 2,
        ready_to_pick_up: 2,
        rider_is_on_the_way: 3,
        completed: 4,
        cancelled: -1,
    }

    ///////////////
    // 03. State //
    ///////////////

    const queryClient = useQueryClient()

    let inputValue = $state(page.url.searchParams.get('code') ?? '')
    let searchedCode = $state(page.url.searchParams.get('code') ?? null)
    let wsConnected = $state(false)
    let isSearching = $state(!!page.url.searchParams.get('code'))
    let searchStartTime = $state(0)
    let payDialogOpen = $state(false)

    let resubmitDpDialogOpen = $state(false)
    let resubmitDpObjectId = $state<string | null>(null)
    let resubmitDpUploading = $state(false)
    let resubmitDpError = $state<string | null>(null)

    /////////////////
    // 05. Queries //
    /////////////////

    const trackQuery = createQuery(() => ({
        queryKey: [
            'order',
            'track',
            searchedCode,
        ],
        enabled: searchedCode !== null && searchedCode.trim().length > 0,
        queryFn: async () => {
            const response = await orderClient.track.$get({
                query: { trackingCode: searchedCode! },
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data as TTrackedOrder
        },
        retry: false,
    }))

    const settingsQuery = createQuery<TOrderSettings>(() => ({
        queryKey: [
            'order',
            'settings',
        ],
        queryFn: async () => {
            const response = await orderClient.settings.$get()
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data as TOrderSettings
        },
        staleTime: 5 * 60 * 1000,
    }))

    /////////////////
    // 04. Derived //
    /////////////////

    const stepIndex = $derived(
        trackQuery.data ? STATUS_STEP[trackQuery.data.status] : -1,
    )

    ///////////////////
    // 06. Mutations //
    ///////////////////

    const resubmitDownpaymentMutation = createMutation(() => ({
        mutationFn: async ({
            trackingCode,
            objectStorageId,
        }: {
            trackingCode: string
            objectStorageId: string
        }) => {
            const response = await (
                orderClient as unknown as {
                    proof: {
                        downpayment: {
                            resubmit: {
                                $post: (opts: {
                                    json: {
                                        trackingCode: string
                                        objectStorageId: string
                                    }
                                }) => Promise<Response>
                            }
                        }
                    }
                }
            ).proof.downpayment.resubmit.$post({
                json: { trackingCode, objectStorageId },
            })
            const json = (await response.json()) as {
                success: boolean
                error?: { message: string }
            }
            if (!json.success)
                throw new Error(json.error?.message ?? 'Failed to resubmit.')
            return json
        },
        onSuccess: () => {
            queryClient.setQueryData(
                [
                    'order',
                    'track',
                    searchedCode,
                ],
                (current: TTrackedOrder | undefined) =>
                    current
                        ? {
                              ...current,
                              proofOfPaymentStatus: null,
                              proofOfPaymentFakeReason: null,
                          }
                        : current,
            )
            resubmitDpDialogOpen = false
            resubmitDpObjectId = null
            resubmitDpError = null
            toast.success('Your proof has been resubmitted for review.')
        },
        onError: (err: Error) => {
            resubmitDpError = err.message
        },
    }))

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        if (trackQuery.isFetching) return
        if (!isSearching) return

        const elapsed = Date.now() - searchStartTime
        const remaining = Math.max(0, 2000 - elapsed)
        const timer = setTimeout(() => (isSearching = false), remaining)
        return () => clearTimeout(timer)
    })

    // WebSocket: connect to the public orders channel and listen for
    // order.statusUpdate events that match the currently tracked order.
    $effect(() => {
        if (!searchedCode) return

        const ws = wsClientManager.connect('orders')
        wsConnected = ws.readyState === WebSocket.OPEN

        function handleOpen() {
            wsConnected = true
        }

        function handleClose() {
            wsConnected = false
        }

        function handleMessage(event: MessageEvent) {
            try {
                const { event: eventType, data } = JSON.parse(
                    event.data as string,
                )
                if (
                    eventType === 'order.statusUpdate' &&
                    trackQuery.data &&
                    data?.id === trackQuery.data.id
                ) {
                    queryClient.setQueryData(
                        [
                            'order',
                            'track',
                            searchedCode,
                        ],
                        (current: TTrackedOrder | undefined) =>
                            current
                                ? { ...current, status: data.status }
                                : current,
                    )
                }

                if (
                    eventType === 'order.remainingBalanceSubmit' &&
                    trackQuery.data &&
                    data?.id === trackQuery.data.id
                ) {
                    queryClient.setQueryData(
                        [
                            'order',
                            'track',
                            searchedCode,
                        ],
                        (current: TTrackedOrder | undefined) =>
                            current
                                ? {
                                      ...current,
                                      remainingBalancePaymentMethod:
                                          data.paymentMethod,
                                      remainingBalanceProofStatus: null,
                                      remainingBalanceProofFakeReason: null,
                                  }
                                : current,
                    )
                }

                if (
                    eventType === 'order.proofResubmit' &&
                    trackQuery.data &&
                    data?.trackingCode === trackQuery.data.trackingCode
                ) {
                    queryClient.setQueryData(
                        [
                            'order',
                            'track',
                            searchedCode,
                        ],
                        (current: TTrackedOrder | undefined) =>
                            current
                                ? {
                                      ...current,
                                      proofOfPaymentStatus: null,
                                      proofOfPaymentFakeReason: null,
                                  }
                                : current,
                    )
                }

                if (
                    eventType === 'order.proofStatusUpdated' &&
                    trackQuery.data &&
                    data?.trackingCode === trackQuery.data.trackingCode
                ) {
                    const proofType = data.proofType as
                        | 'downpayment'
                        | 'remaining_balance'
                    const status = data.status as TProofStatus
                    const fakeReason = (data.fakeReason ?? null) as
                        | string
                        | null

                    if (status === 'accepted' || status === 'received') {
                        toast.success(
                            proofType === 'downpayment'
                                ? 'Your downpayment proof has been accepted!'
                                : 'Your remaining balance proof has been accepted!',
                            { duration: 6000 },
                        )
                    } else if (status === 'fake') {
                        toast.error(
                            proofType === 'downpayment'
                                ? 'Your downpayment proof was rejected.'
                                : 'Your remaining balance proof was rejected.',
                            { duration: 8000 },
                        )
                    }

                    queryClient.setQueryData(
                        [
                            'order',
                            'track',
                            searchedCode,
                        ],
                        (current: TTrackedOrder | undefined) =>
                            current
                                ? {
                                      ...current,
                                      ...(proofType === 'downpayment'
                                          ? {
                                                proofOfPaymentStatus: status,
                                                proofOfPaymentFakeReason:
                                                    status === 'fake'
                                                        ? fakeReason
                                                        : null,
                                            }
                                          : {
                                                remainingBalanceProofStatus:
                                                    status,
                                                remainingBalanceProofFakeReason:
                                                    status === 'fake'
                                                        ? fakeReason
                                                        : null,
                                            }),
                                  }
                                : current,
                    )
                }
            } catch {
                // ignore malformed messages
            }
        }

        ws.addEventListener('open', handleOpen)
        ws.addEventListener('close', handleClose)
        ws.addEventListener('message', handleMessage)

        // Sync initial state
        wsConnected = ws.readyState === WebSocket.OPEN

        return () => {
            ws.removeEventListener('open', handleOpen)
            ws.removeEventListener('close', handleClose)
            ws.removeEventListener('message', handleMessage)
            ws.release()
            wsConnected = false
        }
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    function handleSearch(e: SubmitEvent) {
        e.preventDefault()
        const code = inputValue.trim().toUpperCase()
        if (!code) return
        isSearching = true
        searchStartTime = Date.now()
        searchedCode = code
    }

    async function handleResubmitDownpayment(trackingCode: string) {
        if (!resubmitDpObjectId || resubmitDownpaymentMutation.isPending) return
        resubmitDpError = null
        await resubmitDownpaymentMutation.mutateAsync({
            trackingCode,
            objectStorageId: resubmitDpObjectId,
        })
    }

    function handlePaySuccess(paymentMethod: 'gcash' | 'cash_on_pickup') {
        queryClient.setQueryData(
            [
                'order',
                'track',
                searchedCode,
            ],
            (current: TTrackedOrder | undefined) =>
                current
                    ? {
                          ...current,
                          remainingBalancePaymentMethod: paymentMethod,
                          remainingBalanceProofStatus: null,
                          remainingBalanceProofFakeReason: null,
                      }
                    : current,
        )
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function formatAmount(amount: string) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(Number(amount))
    }

    function formatDate(dateStr: string) {
        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(new Date(dateStr))
    }

    function formatDelivery(dateStr: string | null) {
        if (!dateStr) return null
        return new Intl.DateTimeFormat('en-PH', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(new Date(dateStr))
    }
</script>

<div class="min-h-screen bg-zinc-950 text-zinc-100">
    <!-- Top bar -->
    <header class="border-b border-zinc-800 px-4 py-3">
        <div class="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <a
                href="/"
                class="flex items-center gap-1.5 text-sm text-zinc-400 transition-colors hover:text-zinc-200"
            >
                <ArrowLeftIcon class="size-4" />
                Back to Menu
            </a>

            <!-- Live indicator -->
            {#if searchedCode && trackQuery.data}
                <div
                    class="flex items-center gap-1.5 text-xs
                    {wsConnected ? 'text-emerald-400' : 'text-zinc-500'}"
                >
                    {#if wsConnected}
                        <WifiIcon class="size-3.5" />
                        Live
                    {:else}
                        <WifiOffIcon class="size-3.5" />
                        Offline
                    {/if}
                </div>
            {/if}
        </div>
    </header>

    <main class="mx-auto max-w-2xl px-4 py-10">
        <!-- Page heading -->
        <div class="mb-8 text-center">
            <h1 class="text-2xl font-bold tracking-tight text-zinc-100">
                Track Your Order
            </h1>
            <p class="mt-1.5 text-sm text-zinc-400">
                Enter your 10-character Tracking Code to check your order
                status.
            </p>
        </div>

        <!-- Search form -->
        <form
            onsubmit={handleSearch}
            class="flex gap-2"
        >
            <div class="relative flex-1">
                <SearchIcon
                    class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500"
                />
                <Input
                    type="text"
                    placeholder="e.g. AB3KX9PQ2T"
                    bind:value={inputValue}
                    class="border-zinc-800 bg-zinc-900 pl-9 font-mono uppercase tracking-widest text-zinc-100 placeholder:text-zinc-500 placeholder:normal-case placeholder:tracking-normal focus-visible:ring-blue-500/50"
                    maxlength={20}
                />
            </div>
            <Button
                type="submit"
                disabled={!inputValue.trim() || trackQuery.isFetching}
                class="bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {trackQuery.isFetching ? 'Searching…' : 'Track'}
            </Button>
        </form>

        <div class="mt-8">
            <!-- Finding Order loader -->
            {#if isSearching}
                <div
                    class="flex flex-col items-center gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-14 text-center"
                >
                    <!-- Animated radar rings around search icon -->
                    <div
                        class="relative flex size-20 items-center justify-center"
                    >
                        <div class="radar-ring"></div>
                        <div
                            class="radar-ring"
                            style="animation-delay: 0.53s"
                        ></div>
                        <div
                            class="radar-ring"
                            style="animation-delay: 1.07s"
                        ></div>
                        <SearchIcon
                            class="relative z-10 size-8 text-blue-400"
                        />
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <p class="text-base font-semibold text-zinc-100">
                            Finding Order<span class="finding-dots"></span>
                        </p>
                        <p class="text-sm text-zinc-500">
                            Looking up tracking code
                            <span class="font-mono font-semibold text-zinc-400"
                                >{searchedCode}</span
                            >
                        </p>
                    </div>
                </div>

                <!-- Error / not found -->
            {:else if trackQuery.isError}
                <div
                    class="flex flex-col items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-10 text-center"
                >
                    <CircleXIcon class="size-10 text-red-400" />
                    <div>
                        <p class="font-semibold text-red-300">
                            Order not found
                        </p>
                        <p class="mt-1 text-sm text-zinc-500">
                            No order with tracking code
                            <strong class="font-mono text-zinc-400"
                                >{searchedCode}</strong
                            > was found. Please double-check your code.
                        </p>
                    </div>
                </div>

                <!-- Order card -->
            {:else if trackQuery.data}
                {@const o = trackQuery.data}
                <div
                    class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl"
                >
                    <!-- Card header: tracking code + status -->
                    <div
                        class="flex items-start justify-between gap-4 border-b border-zinc-800 px-6 py-5"
                    >
                        <div>
                            <p class="text-xs font-medium text-zinc-500">
                                Tracking Code
                            </p>
                            <p
                                class="mt-0.5 font-mono text-2xl font-black tracking-widest text-zinc-100"
                            >
                                {o.trackingCode}
                            </p>
                            <p class="mt-1 text-xs text-zinc-500">
                                Placed on {formatDate(o.createdAt)}
                            </p>
                        </div>
                        <span
                            class="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold {STATUS_BADGE[
                                o.status
                            ]}"
                        >
                            <span
                                class="size-1.5 rounded-full {STATUS_DOT[
                                    o.status
                                ]}"
                            ></span>
                            {STATUS_LABELS[o.status]}
                        </span>
                    </div>

                    <!-- Status animation -->
                    <div
                        class="flex flex-col items-center gap-4 border-b border-zinc-800 px-6 py-7"
                    >
                        {#if o.status === 'pending'}
                            <div class="flex flex-col items-center gap-3">
                                <div
                                    class="relative flex items-center justify-center"
                                >
                                    <div
                                        class="absolute size-16 animate-pulse rounded-full bg-yellow-500/10"
                                    ></div>
                                    <ClockIcon
                                        class="spin-slow relative size-10 text-yellow-400"
                                    />
                                </div>
                                <div class="flex gap-1.5">
                                    <div
                                        class="bounce-dot size-2 rounded-full bg-yellow-400"
                                    ></div>
                                    <div
                                        class="bounce-dot size-2 rounded-full bg-yellow-400"
                                        style="animation-delay: 160ms"
                                    ></div>
                                    <div
                                        class="bounce-dot size-2 rounded-full bg-yellow-400"
                                        style="animation-delay: 320ms"
                                    ></div>
                                </div>
                            </div>
                            <p class="text-xs text-zinc-500">
                                We've received your order — hang tight!
                            </p>
                        {:else if o.status === 'cooking'}
                            <div class="flex flex-col items-center gap-2">
                                <div class="flex h-7 items-end gap-3">
                                    <div class="steam"></div>
                                    <div
                                        class="steam"
                                        style="animation-delay: 0.47s"
                                    ></div>
                                    <div
                                        class="steam"
                                        style="animation-delay: 0.93s"
                                    ></div>
                                </div>
                                <div
                                    class="relative flex items-center justify-center"
                                >
                                    <div
                                        class="absolute size-16 animate-pulse rounded-full bg-orange-500/15 blur-md"
                                    ></div>
                                    <CookingPotIcon
                                        class="float-anim relative size-12 text-orange-400"
                                    />
                                </div>
                            </div>
                            <p class="text-xs text-zinc-500">
                                Your food is being lovingly prepared!
                            </p>
                        {:else if o.status === 'looking_for_rider'}
                            <div
                                class="relative flex size-20 items-center justify-center"
                            >
                                <div class="radar-ring"></div>
                                <div
                                    class="radar-ring"
                                    style="animation-delay: 0.53s"
                                ></div>
                                <div
                                    class="radar-ring"
                                    style="animation-delay: 1.07s"
                                ></div>
                                <SearchIcon
                                    class="relative z-10 size-8 text-blue-400"
                                />
                            </div>
                            <p class="text-xs text-zinc-500">
                                Searching for a rider near you!
                            </p>
                        {:else if o.status === 'ready_to_pick_up'}
                            <div
                                class="relative flex size-20 items-center justify-center"
                            >
                                <div
                                    class="absolute size-14 animate-ping rounded-full bg-purple-500/20"
                                    style="animation-duration: 2s"
                                ></div>
                                <PackageCheckIcon
                                    class="bounce-glow-anim relative z-10 size-12 text-purple-400"
                                />
                            </div>
                            <p class="text-xs text-zinc-500">
                                Your order is packed and ready!
                            </p>
                        {:else if o.status === 'rider_is_on_the_way'}
                            <div class="flex flex-col items-center gap-2">
                                <div
                                    class="relative flex h-14 w-36 items-center justify-center overflow-hidden"
                                >
                                    <TruckIcon
                                        class="truck-slide-anim size-12 text-indigo-400"
                                    />
                                </div>
                                <div class="flex gap-2">
                                    <div
                                        class="road-dot h-0.5 w-5 rounded-full bg-zinc-600"
                                    ></div>
                                    <div
                                        class="road-dot h-0.5 w-5 rounded-full bg-zinc-600"
                                        style="animation-delay: 300ms"
                                    ></div>
                                    <div
                                        class="road-dot h-0.5 w-5 rounded-full bg-zinc-600"
                                        style="animation-delay: 600ms"
                                    ></div>
                                    <div
                                        class="road-dot h-0.5 w-5 rounded-full bg-zinc-600"
                                        style="animation-delay: 900ms"
                                    ></div>
                                </div>
                            </div>
                            <p class="text-xs text-zinc-500">
                                Your rider is on the way to you!
                            </p>
                        {:else if o.status === 'completed'}
                            <div
                                class="relative flex size-24 items-center justify-center"
                            >
                                <div class="success-ring"></div>
                                <div
                                    class="success-ring"
                                    style="animation-delay: 0.8s"
                                ></div>
                                <CheckCircle2Icon
                                    class="relative z-10 size-12 text-emerald-400"
                                />
                            </div>
                            <p class="text-xs text-emerald-500">
                                Order delivered — enjoy your meal!
                            </p>
                        {:else if o.status === 'cancelled'}
                            <CircleXIcon
                                class="shake-anim size-12 text-red-400"
                            />
                            <p class="text-xs text-zinc-500">
                                This order has been cancelled.
                            </p>
                        {/if}
                    </div>

                    <!-- Progress stepper (hidden for cancelled) -->
                    {#if o.status !== 'cancelled'}
                        <div class="border-b border-zinc-800 px-6 py-5">
                            <div class="flex items-center">
                                {#each PROGRESS_STEPS as step, i (step.status)}
                                    {@const done = i < stepIndex}
                                    {@const active = i === stepIndex}
                                    <div
                                        class="flex flex-col items-center gap-1.5"
                                    >
                                        <div
                                            class="flex size-8 items-center justify-center rounded-full border-2 transition-all duration-500
                                                {done
                                                ? 'border-emerald-500 bg-emerald-500'
                                                : active
                                                  ? 'border-blue-500 bg-blue-500/20 step-pulse'
                                                  : 'border-zinc-700 bg-zinc-800'}"
                                        >
                                            <step.Icon
                                                class="size-3.5 transition-colors
                                                    {done
                                                    ? 'text-white'
                                                    : active
                                                      ? 'text-blue-400'
                                                      : 'text-zinc-600'}"
                                            />
                                        </div>
                                        <span
                                            class="hidden text-[10px] font-medium sm:block
                                                {done
                                                ? 'text-emerald-400'
                                                : active
                                                  ? 'text-blue-400'
                                                  : 'text-zinc-600'}"
                                        >
                                            {step.label}
                                        </span>
                                    </div>

                                    {#if i < PROGRESS_STEPS.length - 1}
                                        <div
                                            class="h-0.5 flex-1 rounded-full transition-all duration-500
                                                {i < stepIndex
                                                ? 'bg-emerald-500'
                                                : 'bg-zinc-700'}"
                                        ></div>
                                    {/if}
                                {/each}
                            </div>
                        </div>
                    {:else}
                        <div
                            class="border-b border-zinc-800 bg-red-500/5 px-6 py-4"
                        >
                            <div
                                class="flex items-center gap-2 text-sm text-red-400"
                            >
                                <CircleXIcon class="size-4 shrink-0" />
                                This order has been cancelled.
                            </div>
                        </div>
                    {/if}

                    <!-- Delivery info -->
                    <div class="border-b border-zinc-800 px-6 py-4">
                        <div class="flex flex-col gap-2 text-sm">
                            <div class="flex items-center gap-2 text-zinc-400">
                                <TruckIcon
                                    class="size-3.5 shrink-0 text-zinc-500"
                                />
                                {DELIVERY_TYPE_LABELS[o.deliveryType]}
                            </div>
                            {#if o.deliveryAt}
                                <div
                                    class="flex items-center gap-2 text-blue-400"
                                >
                                    <CalendarClockIcon
                                        class="size-3.5 shrink-0"
                                    />
                                    {formatDelivery(o.deliveryAt)}
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Items -->
                    {#if o.items.length > 0}
                        <div class="border-b border-zinc-800 px-6 py-4">
                            <p
                                class="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500"
                            >
                                Items
                            </p>
                            <div class="flex flex-col gap-2">
                                {#each o.items as item (item.id)}
                                    <div
                                        class="flex items-start justify-between gap-3 text-sm"
                                    >
                                        <span
                                            class="leading-snug text-zinc-300"
                                        >
                                            {item.name}{[
                                                item.flavorName,
                                                item.sizeName,
                                            ].filter(Boolean).length
                                                ? ` · ${[item.flavorName, item.sizeName].filter(Boolean).join(' · ')}`
                                                : ''}
                                            <span class="text-zinc-500">
                                                × {item.quantity}</span
                                            >
                                        </span>
                                        <span
                                            class="shrink-0 tabular-nums text-zinc-400"
                                        >
                                            {formatAmount(
                                                String(
                                                    Number(item.price) *
                                                        item.quantity,
                                                ),
                                            )}
                                        </span>
                                    </div>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <!-- Financials -->
                    <div class="px-6 py-4">
                        <div class="flex flex-col gap-2 text-sm">
                            <div
                                class="flex items-center justify-between gap-2"
                            >
                                <span class="text-zinc-500">Order Total</span>
                                <span
                                    class="font-semibold tabular-nums text-zinc-100"
                                    >{formatAmount(o.amountToPay)}</span
                                >
                            </div>
                            {#if o.downpayment}
                                <div
                                    class="flex items-center justify-between gap-2"
                                >
                                    <span class="text-zinc-500"
                                        >Downpayment</span
                                    >
                                    <span class="tabular-nums text-zinc-300"
                                        >{formatAmount(o.downpayment)}</span
                                    >
                                </div>
                                <Separator class="bg-zinc-800" />
                                <div
                                    class="flex items-center justify-between gap-2"
                                >
                                    <span class="text-zinc-500"
                                        >Remaining Balance</span
                                    >
                                    <span
                                        class="font-semibold tabular-nums
                                            {Number(o.amountToPay) -
                                            Number(o.downpayment) <=
                                        0
                                            ? 'text-emerald-400'
                                            : 'text-zinc-100'}"
                                    >
                                        {formatAmount(
                                            String(
                                                Number(o.amountToPay) -
                                                    Number(o.downpayment),
                                            ),
                                        )}
                                    </span>
                                </div>
                            {/if}
                        </div>

                        <!-- Downpayment proof status -->
                        {#if o.downpayment && o.proofOfPaymentObjectStorageId}
                            <div class="mt-3">
                                {#if o.proofOfPaymentStatus === 'received' || o.proofOfPaymentStatus === 'accepted'}
                                    <div
                                        class="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-3"
                                    >
                                        <ShieldCheckIcon
                                            class="size-4 shrink-0 text-emerald-400"
                                        />
                                        <div class="flex flex-col gap-0.5">
                                            <p
                                                class="text-xs font-semibold text-emerald-300"
                                            >
                                                Downpayment Verified
                                            </p>
                                            <p
                                                class="text-xs text-emerald-400/70"
                                            >
                                                Your downpayment proof has been
                                                accepted.
                                            </p>
                                        </div>
                                    </div>
                                {:else if o.proofOfPaymentStatus === 'fake'}
                                    <div
                                        class="flex flex-col gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3.5 py-3"
                                    >
                                        <div class="flex items-start gap-2.5">
                                            <CircleXIcon
                                                class="size-4 shrink-0 text-red-400 mt-0.5"
                                            />
                                            <div class="flex flex-col gap-0.5">
                                                <p
                                                    class="text-xs font-semibold text-red-300"
                                                >
                                                    Downpayment Proof Rejected
                                                </p>
                                                {#if o.proofOfPaymentFakeReason}
                                                    <p
                                                        class="text-xs text-red-400/70"
                                                    >
                                                        Reason: {o.proofOfPaymentFakeReason}
                                                    </p>
                                                {:else}
                                                    <p
                                                        class="text-xs text-red-400/70"
                                                    >
                                                        Please contact the
                                                        restaurant for details.
                                                    </p>
                                                {/if}
                                            </div>
                                        </div>
                                        {#if o.status !== 'cancelled' && o.status !== 'completed'}
                                            <Button
                                                variant="outline"
                                                onclick={() =>
                                                    (resubmitDpDialogOpen = true)}
                                                class="w-full border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 text-xs h-8"
                                            >
                                                <RefreshCwIcon
                                                    class="size-3 mr-1.5"
                                                />
                                                Send Proof Again
                                            </Button>
                                        {/if}
                                    </div>
                                {:else}
                                    <div
                                        class="flex items-center gap-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3.5 py-3"
                                    >
                                        <CircleAlertIcon
                                            class="size-4 shrink-0 text-yellow-500"
                                        />
                                        <div class="flex flex-col gap-0.5">
                                            <p
                                                class="text-xs font-semibold text-yellow-400"
                                            >
                                                Proof Under Review
                                            </p>
                                            <p
                                                class="text-xs text-yellow-500/70"
                                            >
                                                We received your proof and are
                                                reviewing it. Please wait.
                                            </p>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        {/if}

                        {#if o.notes}
                            <div
                                class="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3.5 py-3 text-sm text-zinc-400"
                            >
                                <span class="font-medium text-zinc-500"
                                    >Note:
                                </span>{o.notes}
                            </div>
                        {/if}

                        <!-- Remaining balance payment section -->
                        {#if o.downpayment && Number(o.amountToPay) - Number(o.downpayment) > 0}
                            {@const balance =
                                Number(o.amountToPay) - Number(o.downpayment)}
                            <Separator class="mt-4 bg-zinc-800" />
                            <div class="mt-4 flex flex-col gap-3">
                                {#if o.remainingBalancePaymentMethod === 'gcash'}
                                    {#if o.remainingBalanceProofStatus === 'received' || o.remainingBalanceProofStatus === 'accepted'}
                                        <div
                                            class="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3.5 py-3"
                                        >
                                            <ShieldCheckIcon
                                                class="size-4 shrink-0 text-emerald-400"
                                            />
                                            <div class="flex flex-col gap-0.5">
                                                <p
                                                    class="text-xs font-semibold text-emerald-300"
                                                >
                                                    GCash Payment Verified
                                                </p>
                                                <p
                                                    class="text-xs text-emerald-400/70"
                                                >
                                                    Your remaining balance proof
                                                    has been accepted.
                                                </p>
                                            </div>
                                        </div>
                                    {:else if o.remainingBalanceProofStatus === 'fake'}
                                        <div
                                            class="flex flex-col gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3.5 py-3"
                                        >
                                            <div
                                                class="flex items-start gap-2.5"
                                            >
                                                <CircleXIcon
                                                    class="size-4 shrink-0 text-red-400 mt-0.5"
                                                />
                                                <div
                                                    class="flex flex-col gap-0.5"
                                                >
                                                    <p
                                                        class="text-xs font-semibold text-red-300"
                                                    >
                                                        GCash Proof Rejected
                                                    </p>
                                                    {#if o.remainingBalanceProofFakeReason}
                                                        <p
                                                            class="text-xs text-red-400/70"
                                                        >
                                                            Reason: {o.remainingBalanceProofFakeReason}
                                                        </p>
                                                    {:else}
                                                        <p
                                                            class="text-xs text-red-400/70"
                                                        >
                                                            Please contact the
                                                            restaurant for
                                                            details.
                                                        </p>
                                                    {/if}
                                                </div>
                                            </div>
                                            {#if o.status !== 'cancelled' && o.status !== 'completed'}
                                                <Button
                                                    variant="outline"
                                                    onclick={() =>
                                                        (payDialogOpen = true)}
                                                    class="w-full border-red-500/40 bg-red-500/10 text-red-300 hover:bg-red-500/20 hover:text-red-200 text-xs h-8"
                                                >
                                                    <RefreshCwIcon
                                                        class="size-3 mr-1.5"
                                                    />
                                                    Send Proof Again
                                                </Button>
                                            {/if}
                                        </div>
                                    {:else}
                                        <div
                                            class="flex items-center gap-2.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3.5 py-3"
                                        >
                                            <CircleAlertIcon
                                                class="size-4 shrink-0 text-yellow-500"
                                            />
                                            <div class="flex flex-col gap-0.5">
                                                <p
                                                    class="text-xs font-semibold text-yellow-400"
                                                >
                                                    GCash Proof Under Review
                                                </p>
                                                <p
                                                    class="text-xs text-yellow-500/70"
                                                >
                                                    We received your proof and
                                                    are reviewing it. Please
                                                    wait.
                                                </p>
                                            </div>
                                        </div>
                                    {/if}
                                {:else if o.remainingBalancePaymentMethod === 'cash_on_pickup'}
                                    <div
                                        class="flex items-center gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3.5 py-3"
                                    >
                                        <BanknoteIcon
                                            class="size-4 shrink-0 text-amber-400"
                                        />
                                        <div class="flex flex-col gap-0.5">
                                            <p
                                                class="text-xs font-semibold text-amber-300"
                                            >
                                                Cash on Pickup
                                            </p>
                                            <p
                                                class="text-xs text-amber-400/70"
                                            >
                                                Bring {formatAmount(
                                                    String(balance),
                                                )} in cash when you pick up.
                                            </p>
                                        </div>
                                    </div>
                                {:else if o.status !== 'cancelled' && o.status !== 'completed'}
                                    <Button
                                        onclick={() => (payDialogOpen = true)}
                                        class="w-full bg-blue-600 text-white hover:bg-blue-500"
                                    >
                                        Pay Remaining Balance
                                    </Button>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Empty state -->
            {:else if !searchedCode}
                <div
                    class="flex flex-col items-center gap-3 py-16 text-center text-zinc-600"
                >
                    <SearchIcon class="size-10" />
                    <p class="text-sm">
                        Enter your Tracking Code above to see your order
                        details.
                    </p>
                </div>
            {/if}
        </div>
    </main>
</div>

{#if trackQuery.data && payDialogOpen}
    {@const o = trackQuery.data}
    {@const balance = Number(o.amountToPay) - Number(o.downpayment ?? 0)}
    <PayRemainingBalanceDialog
        bind:open={payDialogOpen}
        trackingCode={o.trackingCode}
        remainingBalance={balance}
        gcashAccountName={settingsQuery.data?.gcashAccountName ?? null}
        gcashNumber={settingsQuery.data?.gcashNumber ?? null}
        paymentInstructions={settingsQuery.data?.paymentInstructions ?? null}
        onSuccess={handlePaySuccess}
    />
{/if}

{#if trackQuery.data && resubmitDpDialogOpen}
    {@const o = trackQuery.data}
    <Dialog.Root
        bind:open={resubmitDpDialogOpen}
        onOpenChange={(isOpen) => {
            if (!isOpen) {
                resubmitDpObjectId = null
                resubmitDpError = null
            }
        }}
    >
        <Dialog.Content
            class="flex max-h-[90dvh] flex-col gap-0 border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-sm p-0"
        >
            <Dialog.Header class="shrink-0 border-b border-zinc-800 px-6 py-5">
                <Dialog.Title class="text-base font-semibold text-zinc-100">
                    Resubmit Downpayment Proof
                </Dialog.Title>
                <Dialog.Description class="mt-0.5 text-sm text-zinc-400">
                    Upload a new payment screenshot for your downpayment.
                </Dialog.Description>
            </Dialog.Header>

            <div class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                <ProofImageUploader
                    bind:objectStorageId={resubmitDpObjectId}
                    bind:isUploading={resubmitDpUploading}
                />

                {#if resubmitDpError}
                    <p
                        class="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-400"
                    >
                        {resubmitDpError}
                    </p>
                {/if}
            </div>

            <div
                class="shrink-0 border-t border-zinc-800 px-6 py-4 flex items-center gap-3"
            >
                <Button
                    variant="outline"
                    onclick={() => (resubmitDpDialogOpen = false)}
                    disabled={resubmitDownpaymentMutation.isPending}
                    class="flex-1 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                >
                    Cancel
                </Button>
                <Button
                    onclick={() => handleResubmitDownpayment(o.trackingCode)}
                    disabled={!resubmitDpObjectId ||
                        resubmitDpUploading ||
                        resubmitDownpaymentMutation.isPending}
                    class="flex-1 bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                >
                    {#if resubmitDownpaymentMutation.isPending}
                        Submitting…
                    {:else}
                        Submit Proof
                    {/if}
                </Button>
            </div>
        </Dialog.Content>
    </Dialog.Root>
{/if}

<style>
    /* finding order — animated ellipsis */
    .finding-dots::after {
        content: '';
        animation: finding-dots 1.5s steps(4, end) infinite;
    }
    @keyframes finding-dots {
        0% {
            content: '';
        }
        25% {
            content: '.';
        }
        50% {
            content: '..';
        }
        75% {
            content: '...';
        }
        100% {
            content: '';
        }
    }

    /* pending — clock spin */
    @keyframes spin-slow {
        to {
            transform: rotate(360deg);
        }
    }
    .spin-slow {
        animation: spin-slow 10s linear infinite;
    }

    /* pending — waiting dots */
    @keyframes bounce-dot {
        0%,
        80%,
        100% {
            transform: translateY(0);
        }
        40% {
            transform: translateY(-6px);
        }
    }
    .bounce-dot {
        animation: bounce-dot 1.4s ease-in-out infinite;
    }

    /* cooking — chef hat float */
    @keyframes float-anim {
        0%,
        100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-8px);
        }
    }
    .float-anim {
        animation: float-anim 2s ease-in-out infinite;
    }

    /* cooking — steam particles */
    @keyframes steam-rise {
        0% {
            transform: translateY(0) scaleX(1);
            opacity: 0.8;
        }
        100% {
            transform: translateY(-24px) scaleX(0.4);
            opacity: 0;
        }
    }
    .steam {
        width: 3px;
        height: 16px;
        border-radius: 9999px;
        background: linear-gradient(
            to top,
            rgba(251, 146, 60, 0.7),
            transparent
        );
        animation: steam-rise 1.4s ease-in-out infinite;
    }

    /* looking_for_rider — radar rings */
    @keyframes radar-expand {
        0% {
            transform: scale(0.2);
            opacity: 0.9;
        }
        100% {
            transform: scale(1.1);
            opacity: 0;
        }
    }
    .radar-ring {
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        border: 2px solid rgb(96, 165, 250);
        animation: radar-expand 1.6s ease-out infinite;
    }

    /* ready_to_pick_up — bouncing glow */
    @keyframes bounce-glow {
        0%,
        100% {
            transform: translateY(0);
            filter: drop-shadow(0 0 6px rgba(192, 132, 252, 0.5));
        }
        50% {
            transform: translateY(-10px);
            filter: drop-shadow(0 0 16px rgba(192, 132, 252, 0.9));
        }
    }
    .bounce-glow-anim {
        animation: bounce-glow 1.8s ease-in-out infinite;
    }

    /* rider_is_on_the_way — truck slide */
    @keyframes truck-slide {
        0%,
        100% {
            transform: translateX(-14px);
        }
        50% {
            transform: translateX(14px);
        }
    }
    .truck-slide-anim {
        animation: truck-slide 2s ease-in-out infinite;
    }

    /* rider_is_on_the_way — road dashes */
    @keyframes road-slide {
        0% {
            transform: translateX(12px);
            opacity: 0;
        }
        20% {
            opacity: 1;
        }
        100% {
            transform: translateX(-12px);
            opacity: 0;
        }
    }
    .road-dot {
        animation: road-slide 1.8s linear infinite;
    }

    /* completed — expanding rings */
    @keyframes success-expand {
        0% {
            transform: scale(0.5);
            opacity: 0.7;
        }
        100% {
            transform: scale(1.8);
            opacity: 0;
        }
    }
    .success-ring {
        position: absolute;
        inset: 0;
        border-radius: 9999px;
        border: 2px solid rgb(52, 211, 153);
        animation: success-expand 2.2s ease-out infinite;
    }

    /* cancelled — shake */
    @keyframes shake {
        0%,
        100% {
            transform: rotate(0deg);
        }
        20% {
            transform: rotate(-14deg);
        }
        40% {
            transform: rotate(14deg);
        }
        60% {
            transform: rotate(-8deg);
        }
        80% {
            transform: rotate(8deg);
        }
    }
    .shake-anim {
        animation: shake 0.7s ease-in-out 3;
    }

    /* progress stepper — active step glow pulse */
    @keyframes step-pulse {
        0%,
        100% {
            box-shadow: 0 0 8px 1px rgba(59, 130, 246, 0.25);
        }
        50% {
            box-shadow: 0 0 20px 5px rgba(59, 130, 246, 0.45);
        }
    }
    .step-pulse {
        animation: step-pulse 2s ease-in-out infinite;
    }
</style>
