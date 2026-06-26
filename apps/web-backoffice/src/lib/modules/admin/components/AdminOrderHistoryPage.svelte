<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import * as Dialog from '@hyperion/ui/components/dialog'
    import { Input } from '@hyperion/ui/components/input'
    import { Separator } from '@hyperion/ui/components/separator'
    import { Skeleton } from '@hyperion/ui/components/skeleton'
    import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock'
    import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2'
    import HistoryIcon from '@lucide/svelte/icons/history'
    import ImageOffIcon from '@lucide/svelte/icons/image-off'
    import PhoneIcon from '@lucide/svelte/icons/phone'
    import SearchIcon from '@lucide/svelte/icons/search'
    import TruckIcon from '@lucide/svelte/icons/truck'
    import XCircleIcon from '@lucide/svelte/icons/x-circle'
    import { createQuery, useQueryClient } from '@tanstack/svelte-query'

    import { adminClient } from '$lib/clients'
    import { wsClientManager } from '$lib/utilities/wsClientManager'

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

    type TOrderItem = {
        id: number
        productId: number | null
        name: string
        sizeName: string | null
        quantity: number
        price: string
    }

    type TOrder = {
        id: number
        publicId: string
        customerName: string
        contactNumber: string
        contactNumber2: string | null
        deliveryType: TDeliveryType
        deliveryAt: string | null
        downpayment: string | null
        amountToPay: string
        proofOfPaymentObjectStorageId: string | null
        proofOfPaymentUrl: string | null
        status: TOrderStatus
        notes: string | null
        createdAt: string
        items: TOrderItem[]
    }

    const TERMINAL_STATUSES: TOrderStatus[] = [
        'completed',
        'cancelled',
    ]

    const STATUS_LABELS: Record<TOrderStatus, string> = {
        pending: 'Pending',
        cooking: 'Cooking',
        looking_for_rider: 'Looking For Rider',
        ready_to_pick_up: 'Ready to Pick Up',
        rider_is_on_the_way: 'Rider is on the Way',
        completed: 'Completed',
        cancelled: 'Cancelled',
    }

    const STATUS_COLORS: Record<TOrderStatus, string> = {
        pending:
            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
        cooking:
            'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
        looking_for_rider:
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        ready_to_pick_up:
            'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
        rider_is_on_the_way:
            'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
        completed:
            'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        cancelled:
            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    }

    const DELIVERY_TYPE_LABELS: Record<TDeliveryType, string> = {
        self_pickup: 'Self Pickup',
        lalamove: 'Via Lalamove',
        other_courier: 'Other Courier',
    }

    ///////////////
    // 03. State //
    ///////////////

    const queryClient = useQueryClient()

    let detailDialogOpen = $state(false)
    let proofDialogOpen = $state(false)
    let viewingOrder = $state<TOrder | null>(null)
    let proofImageUrl = $state<string | null>(null)

    let searchQuery = $state('')
    let filterStatus = $state<'completed' | 'cancelled' | 'all'>('all')

    /////////////////
    // 05. Queries //
    /////////////////

    const ordersQuery = createQuery(() => ({
        queryKey: [
            'admin',
            'orders',
        ],
        queryFn: async () => {
            const response = await adminClient.order.readMany.$get({
                query: { limit: '200', offset: '0', sortOrder: 'asc' },
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data as TOrder[]
        },
    }))

    /////////////////
    // 04. Derived //
    /////////////////

    const historyOrders = $derived.by(() => {
        const orders = (ordersQuery.data ?? []).filter((o) =>
            TERMINAL_STATUSES.includes(o.status),
        )
        return orders
            .filter((o) => {
                const matchesStatus =
                    filterStatus === 'all' || o.status === filterStatus
                const matchesSearch =
                    searchQuery.trim() === '' ||
                    o.customerName
                        .toLowerCase()
                        .includes(searchQuery.trim().toLowerCase())
                return matchesStatus && matchesSearch
            })
            .sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime(),
            )
    })

    const completedCount = $derived(
        (ordersQuery.data ?? []).filter((o) => o.status === 'completed').length,
    )

    const cancelledCount = $derived(
        (ordersQuery.data ?? []).filter((o) => o.status === 'cancelled').length,
    )

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        const ws = wsClientManager.connect('orders')

        function handleMessage() {
            queryClient.invalidateQueries({
                queryKey: [
                    'admin',
                    'orders',
                ],
            })
        }

        ws.addEventListener('message', handleMessage)

        return () => {
            ws.removeEventListener('message', handleMessage)
            ws.release()
        }
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    function openDetailDialog(o: TOrder) {
        viewingOrder = o
        detailDialogOpen = true
    }

    function openProofDialog(url: string) {
        proofImageUrl = url
        proofDialogOpen = true
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

    function remainingBalance(amountToPay: string, downpayment: string | null) {
        return Number(amountToPay) - Number(downpayment ?? 0)
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

    function formatDelivery(dateStr: string | null): string {
        if (!dateStr) return 'No delivery date'
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

<main class="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-6 md:pt-0">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight">Order History</h1>
            <p class="text-muted-foreground text-sm">
                {#if ordersQuery.data}
                    {historyOrders.length} of {completedCount + cancelledCount}
                    {completedCount + cancelledCount === 1
                        ? 'archived order'
                        : 'archived orders'}
                {:else}
                    Completed and cancelled orders.
                {/if}
            </p>
        </div>
    </div>

    <!-- Summary stats -->
    {#if ordersQuery.data && (completedCount > 0 || cancelledCount > 0)}
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:w-96">
            <div
                class="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
            >
                <CheckCircle2Icon
                    class="size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                />
                <div>
                    <p
                        class="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300"
                    >
                        {completedCount}
                    </p>
                    <p
                        class="text-xs text-emerald-600/70 dark:text-emerald-400/70"
                    >
                        Completed
                    </p>
                </div>
            </div>
            <div
                class="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3"
            >
                <XCircleIcon
                    class="size-5 shrink-0 text-red-600 dark:text-red-400"
                />
                <div>
                    <p
                        class="text-lg font-bold tabular-nums text-red-700 dark:text-red-300"
                    >
                        {cancelledCount}
                    </p>
                    <p class="text-xs text-red-600/70 dark:text-red-400/70">
                        Cancelled
                    </p>
                </div>
            </div>
        </div>
    {/if}

    <!-- Filters -->
    <div class="flex flex-col gap-3">
        <!-- Search -->
        <div class="relative">
            <SearchIcon
                class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
                type="search"
                placeholder="Search customer name…"
                bind:value={searchQuery}
                class="pl-9"
            />
        </div>

        <!-- Status pills -->
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {#each [{ value: 'all', label: 'All' }, { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' }] as pill (pill.value)}
                <button
                    type="button"
                    onclick={() =>
                        (filterStatus = pill.value as
                            | 'completed'
                            | 'cancelled'
                            | 'all')}
                    class="inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors
                        {filterStatus === pill.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground hover:bg-muted'}"
                >
                    {pill.label}
                </button>
            {/each}
        </div>
    </div>

    <Separator />

    <!-- Loading -->
    {#if ordersQuery.isPending}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each { length: 6 }, i (i)}
                <div class="bg-card flex flex-col gap-3 rounded-xl border p-4">
                    <div class="flex items-center justify-between">
                        <Skeleton class="h-5 w-20 rounded-full" />
                        <Skeleton class="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton class="h-5 w-3/4" />
                    <Skeleton class="h-4 w-1/2" />
                    <Separator />
                    <div class="flex flex-col gap-2">
                        <Skeleton class="h-4 w-full" />
                        <Skeleton class="h-4 w-2/3" />
                    </div>
                    <Separator />
                    <div class="flex items-center justify-between">
                        <Skeleton class="size-12 rounded-lg" />
                        <Skeleton class="h-3 w-28" />
                    </div>
                </div>
            {/each}
        </div>

        <!-- Error -->
    {:else if ordersQuery.isError}
        <div
            class="text-destructive flex flex-1 items-center justify-center text-sm"
        >
            Failed to load order history. Please refresh.
        </div>

        <!-- Empty -->
    {:else if historyOrders.length === 0}
        <div
            class="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center"
        >
            <div class="bg-muted rounded-full p-5">
                <HistoryIcon class="text-muted-foreground size-8" />
            </div>
            <div>
                <p class="font-semibold">No order history found</p>
                <p class="text-muted-foreground mt-1 text-sm">
                    {#if searchQuery || filterStatus !== 'all'}
                        Try adjusting your search or filter.
                    {:else}
                        Completed and cancelled orders will appear here.
                    {/if}
                </p>
            </div>
        </div>

        <!-- Cards -->
    {:else}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each historyOrders as o (o.id)}
                <div
                    class="bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm opacity-90 transition-opacity hover:opacity-100"
                >
                    <!-- Card Header: status badge + view button -->
                    <div
                        class="flex items-center justify-between gap-2 px-4 pt-4 pb-3"
                    >
                        <span
                            class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium {STATUS_COLORS[
                                o.status
                            ]}"
                        >
                            {STATUS_LABELS[o.status]}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onclick={() => openDetailDialog(o)}
                            class="h-7 px-2 text-xs"
                        >
                            View Details
                        </Button>
                    </div>

                    <!-- Delivery date banner -->
                    <div
                        class="mx-4 mb-3 flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/40 px-3 py-2"
                    >
                        <CalendarClockIcon
                            class="text-muted-foreground size-3.5 shrink-0"
                        />
                        <span
                            class="text-muted-foreground truncate text-xs font-medium"
                        >
                            {formatDelivery(o.deliveryAt)}
                        </span>
                    </div>

                    <!-- Customer info -->
                    <div class="flex flex-col gap-1 px-4 pb-3">
                        <p class="font-semibold leading-snug">
                            {o.customerName}
                        </p>
                        <div class="mt-0.5 flex flex-wrap gap-1.5">
                            <a
                                href="tel:{o.contactNumber}"
                                class="bg-muted text-muted-foreground hover:bg-muted/70 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                            >
                                <PhoneIcon class="size-3 shrink-0" />
                                {o.contactNumber}
                            </a>
                            {#if o.contactNumber2}
                                <a
                                    href="tel:{o.contactNumber2}"
                                    class="bg-muted text-muted-foreground hover:bg-muted/70 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                                >
                                    <PhoneIcon class="size-3 shrink-0" />
                                    {o.contactNumber2}
                                </a>
                            {/if}
                        </div>
                    </div>

                    <!-- Delivery type -->
                    <div class="border-t px-4 py-2.5">
                        <span
                            class="text-muted-foreground flex items-center gap-1.5 text-xs"
                        >
                            <TruckIcon class="size-3.5 shrink-0" />
                            {DELIVERY_TYPE_LABELS[o.deliveryType]}
                        </span>
                    </div>

                    <!-- Order Items -->
                    {#if o.items.length > 0}
                        <div class="border-t px-4 py-3 flex flex-col gap-1.5">
                            {#each o.items as item (item.id)}
                                <div
                                    class="flex items-start justify-between gap-2 text-sm"
                                >
                                    <span
                                        class="leading-snug text-muted-foreground"
                                    >
                                        {item.name}{item.sizeName
                                            ? ` (${item.sizeName})`
                                            : ''} &times; {item.quantity}
                                    </span>
                                    <span
                                        class="tabular-nums shrink-0 text-muted-foreground"
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
                    {/if}

                    <!-- Financials -->
                    <div class="border-t px-4 py-3 flex flex-col gap-1.5">
                        <div class="flex items-center justify-between text-sm">
                            <span class="text-muted-foreground">Amount</span>
                            <span class="font-semibold tabular-nums">
                                {formatAmount(o.amountToPay)}
                            </span>
                        </div>
                        {#if o.downpayment}
                            <div
                                class="flex items-center justify-between text-sm"
                            >
                                <span class="text-muted-foreground"
                                    >Downpayment</span
                                >
                                <span class="tabular-nums"
                                    >{formatAmount(o.downpayment)}</span
                                >
                            </div>
                            <div
                                class="flex items-center justify-between text-sm"
                            >
                                <span class="text-muted-foreground"
                                    >Remaining</span
                                >
                                <span
                                    class="tabular-nums font-medium {remainingBalance(
                                        o.amountToPay,
                                        o.downpayment,
                                    ) <= 0
                                        ? 'text-emerald-600'
                                        : ''}"
                                >
                                    {formatAmount(
                                        String(
                                            remainingBalance(
                                                o.amountToPay,
                                                o.downpayment,
                                            ),
                                        ),
                                    )}
                                </span>
                            </div>
                        {/if}
                    </div>

                    <!-- Footer: proof thumbnail + order date -->
                    <div
                        class="border-t px-4 py-3 flex items-center justify-between gap-3 mt-auto"
                    >
                        {#if o.proofOfPaymentUrl}
                            <button
                                type="button"
                                onclick={() =>
                                    openProofDialog(o.proofOfPaymentUrl!)}
                                class="group relative size-12 shrink-0 overflow-hidden rounded-lg border transition-opacity hover:opacity-80"
                                aria-label="View proof of payment"
                            >
                                <img
                                    src={o.proofOfPaymentUrl}
                                    alt="Proof of payment"
                                    class="size-full object-cover"
                                />
                            </button>
                        {:else}
                            <div
                                class="bg-muted/60 border-dashed flex size-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg border"
                            >
                                <ImageOffIcon
                                    class="text-muted-foreground/50 size-4"
                                />
                                <span
                                    class="text-muted-foreground/50 text-[9px] font-medium leading-none"
                                    >No proof</span
                                >
                            </div>
                        {/if}
                        <span
                            class="text-muted-foreground text-xs text-right leading-snug"
                        >
                            Ordered<br />{formatDate(o.createdAt)}
                        </span>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</main>

<!-- Order Detail Dialog -->
<Dialog.Root bind:open={detailDialogOpen}>
    <Dialog.Content class="sm:max-w-lg">
        <Dialog.Header>
            <Dialog.Title>Order #{viewingOrder?.id}</Dialog.Title>
            <Dialog.Description>
                Placed on {viewingOrder
                    ? formatDate(viewingOrder.createdAt)
                    : ''}
            </Dialog.Description>
        </Dialog.Header>

        {#if viewingOrder}
            <div class="flex flex-col gap-4 text-sm">
                <!-- Status -->
                <div class="flex items-center justify-between">
                    <span class="text-muted-foreground">Status</span>
                    <span
                        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium {STATUS_COLORS[
                            viewingOrder.status
                        ]}"
                    >
                        {STATUS_LABELS[viewingOrder.status]}
                    </span>
                </div>

                <Separator />

                <!-- Customer -->
                <div class="grid grid-cols-2 gap-x-4 gap-y-2">
                    <span class="text-muted-foreground">Customer</span>
                    <span class="font-medium">{viewingOrder.customerName}</span>

                    <span class="text-muted-foreground">Contact 1</span>
                    <a
                        href="tel:{viewingOrder.contactNumber}"
                        class="bg-muted text-muted-foreground hover:bg-muted/70 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                    >
                        <PhoneIcon class="size-3 shrink-0" />
                        {viewingOrder.contactNumber}
                    </a>

                    {#if viewingOrder.contactNumber2}
                        <span class="text-muted-foreground">Contact 2</span>
                        <a
                            href="tel:{viewingOrder.contactNumber2}"
                            class="bg-muted text-muted-foreground hover:bg-muted/70 inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors"
                        >
                            <PhoneIcon class="size-3 shrink-0" />
                            {viewingOrder.contactNumber2}
                        </a>
                    {/if}

                    <span class="text-muted-foreground">Delivery Date</span>
                    <span class="font-medium">
                        {formatDelivery(viewingOrder.deliveryAt)}
                    </span>

                    <span class="text-muted-foreground">Delivery Type</span>
                    <span>
                        {DELIVERY_TYPE_LABELS[viewingOrder.deliveryType]}
                    </span>

                    {#if viewingOrder.downpayment}
                        <span class="text-muted-foreground">Downpayment</span>
                        <span>{formatAmount(viewingOrder.downpayment)}</span>
                    {/if}

                    <span class="text-muted-foreground">Amount</span>
                    <span class="font-medium">
                        {formatAmount(viewingOrder.amountToPay)}
                    </span>

                    {#if viewingOrder.downpayment}
                        <span class="text-muted-foreground">
                            Remaining Balance
                        </span>
                        <span
                            class="font-medium {remainingBalance(
                                viewingOrder.amountToPay,
                                viewingOrder.downpayment,
                            ) <= 0
                                ? 'text-emerald-600'
                                : ''}"
                        >
                            {formatAmount(
                                String(
                                    remainingBalance(
                                        viewingOrder.amountToPay,
                                        viewingOrder.downpayment,
                                    ),
                                ),
                            )}
                        </span>
                    {/if}
                </div>

                {#if viewingOrder.items.length > 0}
                    <Separator />
                    <div class="flex flex-col gap-2">
                        <p class="text-muted-foreground text-xs">Order Items</p>
                        {#each viewingOrder.items as item (item.id)}
                            <div
                                class="flex items-start justify-between gap-3 text-sm"
                            >
                                <div class="leading-snug">
                                    <span class="font-medium">{item.name}</span>
                                    {#if item.sizeName}
                                        <span class="text-muted-foreground">
                                            · {item.sizeName}
                                        </span>
                                    {/if}
                                    <span class="text-muted-foreground">
                                        × {item.quantity}
                                    </span>
                                </div>
                                <div class="text-right tabular-nums shrink-0">
                                    <p>
                                        {formatAmount(item.price)}
                                        <span class="text-muted-foreground"
                                            >ea.</span
                                        >
                                    </p>
                                    <p class="font-medium">
                                        {formatAmount(
                                            String(
                                                Number(item.price) *
                                                    item.quantity,
                                            ),
                                        )}
                                    </p>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if viewingOrder.notes}
                    <Separator />
                    <div>
                        <p class="text-muted-foreground mb-1 text-xs">Notes</p>
                        <p>{viewingOrder.notes}</p>
                    </div>
                {/if}

                {#if viewingOrder.proofOfPaymentUrl}
                    <Separator />
                    <div>
                        <p class="text-muted-foreground mb-2 text-xs">
                            Proof of Payment
                        </p>
                        <button
                            type="button"
                            onclick={() =>
                                openProofDialog(
                                    viewingOrder!.proofOfPaymentUrl!,
                                )}
                            class="hover:opacity-80 transition-opacity block"
                            aria-label="View full proof of payment"
                        >
                            <img
                                src={viewingOrder.proofOfPaymentUrl}
                                alt="Proof of payment"
                                class="w-full max-h-48 rounded-lg object-contain border"
                            />
                        </button>
                    </div>
                {/if}
            </div>
        {/if}

        <Dialog.Footer>
            <Button
                variant="outline"
                onclick={() => (detailDialogOpen = false)}
            >
                Close
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Proof of Payment Fullscreen Dialog -->
<Dialog.Root bind:open={proofDialogOpen}>
    <Dialog.Content class="sm:max-w-2xl">
        <Dialog.Header>
            <Dialog.Title>Proof of Payment</Dialog.Title>
        </Dialog.Header>
        {#if proofImageUrl}
            <img
                src={proofImageUrl}
                alt="Proof of payment"
                class="w-full rounded-lg object-contain max-h-[70vh]"
            />
        {/if}
        <Dialog.Footer>
            <Button
                variant="outline"
                onclick={() => (proofDialogOpen = false)}
            >
                Close
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>
