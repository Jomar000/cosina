<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import * as Dialog from '@hyperion/ui/components/dialog'
    import * as DropdownMenu from '@hyperion/ui/components/dropdown-menu'
    import { Input } from '@hyperion/ui/components/input'
    import { Separator } from '@hyperion/ui/components/separator'
    import { Skeleton } from '@hyperion/ui/components/skeleton'
    import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock'
    import CheckIcon from '@lucide/svelte/icons/check'
    import CopyIcon from '@lucide/svelte/icons/copy'
    import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical'
    import HistoryIcon from '@lucide/svelte/icons/history'
    import ImageOffIcon from '@lucide/svelte/icons/image-off'
    import PhoneIcon from '@lucide/svelte/icons/phone'
    import SearchIcon from '@lucide/svelte/icons/search'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import TruckIcon from '@lucide/svelte/icons/truck'
    import {
        createMutation,
        createQuery,
        useQueryClient,
    } from '@tanstack/svelte-query'
    import { toast } from 'svelte-sonner'

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
        trackingCode: string
        customerName: string
        contactNumber: string
        contactNumber2: string | null
        deliveryType: TDeliveryType
        deliveryAt: string | null
        downpayment: string | null
        amountToPay: string
        proofOfPaymentObjectStorageId: string | null
        proofOfPaymentUrl: string | null
        proofOfPaymentStatus: string | null
        remainingBalancePaymentMethod: string | null
        remainingBalanceProofObjectStorageId: string | null
        remainingBalanceProofUrl: string | null
        remainingBalanceProofStatus: string | null
        remainingBalanceSenderName: string | null
        remainingBalanceSenderNumber: string | null
        remainingBalanceAmountSent: string | null
        status: TOrderStatus
        notes: string | null
        createdAt: string
        items: TOrderItem[]
    }

    const ACTIVE_STATUSES: TOrderStatus[] = [
        'pending',
        'cooking',
        'looking_for_rider',
        'ready_to_pick_up',
        'rider_is_on_the_way',
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

    const STATUS_TRANSITIONS: Record<TOrderStatus, TOrderStatus[]> = {
        pending: [
            'cooking',
            'cancelled',
        ],
        cooking: [
            'looking_for_rider',
            'ready_to_pick_up',
            'cancelled',
        ],
        looking_for_rider: [
            'rider_is_on_the_way',
            'cancelled',
        ],
        ready_to_pick_up: [
            'completed',
            'cancelled',
        ],
        rider_is_on_the_way: [
            'completed',
            'cancelled',
        ],
        completed: [],
        cancelled: [],
    }

    ///////////////
    // 03. State //
    ///////////////

    const queryClient = useQueryClient()

    let detailDialogOpen = $state(false)
    let proofDialogOpen = $state(false)
    let viewingOrder = $state<TOrder | null>(null)
    let proofImageUrl = $state<string | null>(null)
    let copiedPublicId = $state<string | null>(null)

    let searchQuery = $state('')
    let filterStatus = $state<TOrderStatus | 'all'>('all')

    const ordersQuery = createQuery(() => ({
        queryKey: [
            'admin',
            'orders',
        ],
        queryFn: async () => {
            const response = await adminClient.order.readMany.$get({
                query: { limit: '100', offset: '0', sortOrder: 'asc' },
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data as TOrder[]
        },
    }))

    /////////////////
    // 04. Derived //
    /////////////////

    const filteredOrders = $derived.by(() => {
        const orders = (ordersQuery.data ?? []).filter((o) =>
            ACTIVE_STATUSES.includes(o.status),
        )
        return orders.filter((o) => {
            const matchesStatus =
                filterStatus === 'all' || o.status === filterStatus
            const matchesSearch =
                searchQuery.trim() === '' ||
                o.customerName
                    .toLowerCase()
                    .includes(searchQuery.trim().toLowerCase())
            return matchesStatus && matchesSearch
        })
    })

    const activeOrderCount = $derived(
        (ordersQuery.data ?? []).filter((o) =>
            ACTIVE_STATUSES.includes(o.status),
        ).length,
    )

    /////////////////
    // 05. Queries //
    /////////////////

    ///////////////////
    // 06. Mutations //
    ///////////////////

    const updateStatusMutation = createMutation(() => ({
        mutationKey: [
            'admin',
            'order',
            'updateStatus',
        ],
        mutationFn: async (payload: {
            orderId: number
            status: TOrderStatus
        }) => {
            const response = await adminClient.order.updateStatus.$post({
                json: payload,
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [
                    'admin',
                    'orders',
                ],
            })
            toast.success('Order status updated.')
        },
        onError: (err: Error) => toast.error(err.message),
    }))

    type TProofType = 'downpayment' | 'remaining_balance'
    type TProofStatus = 'accepted' | 'fake' | 'received'

    const updateProofStatusMutation = createMutation(() => ({
        mutationKey: [
            'admin',
            'order',
            'proof',
            'updateStatus',
        ],
        mutationFn: async (payload: {
            orderId: number
            proofType: TProofType
            status: TProofStatus
        }) => {
            const response = await (
                adminClient.order as unknown as {
                    proof: {
                        updateStatus: {
                            $post: (opts: {
                                json: typeof payload
                            }) => Promise<Response>
                        }
                    }
                }
            ).proof.updateStatus.$post({ json: payload })
            const json = (await response.json()) as {
                success: boolean
                data?: unknown
                error?: { message: string }
            }
            if (!json.success)
                throw new Error(
                    json.error?.message ?? 'Failed to update proof status.',
                )
            return json.data
        },
        onSuccess: (
            _data: unknown,
            variables: {
                orderId: number
                proofType: TProofType
                status: TProofStatus
            },
        ) => {
            queryClient.invalidateQueries({
                queryKey: [
                    'admin',
                    'orders',
                ],
            })
            if (viewingOrder?.id === variables.orderId) {
                const field =
                    variables.proofType === 'downpayment'
                        ? 'proofOfPaymentStatus'
                        : 'remainingBalanceProofStatus'
                viewingOrder = { ...viewingOrder, [field]: variables.status }
            }
            toast.success('Proof status updated.')
        },
        onError: (err: Error) => toast.error(err.message),
    }))

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        const ws = wsClientManager.connect('orders')

        function handleMessage(event: MessageEvent) {
            try {
                const { event: eventType, data } = JSON.parse(event.data)
                if (eventType === 'order.create') {
                    queryClient.setQueryData(
                        [
                            'admin',
                            'orders',
                        ],
                        (current: TOrder[] | undefined) =>
                            current
                                ? [
                                      data as TOrder,
                                      ...current,
                                  ]
                                : [data as TOrder],
                    )
                    toast.info('New order received', {
                        description: `${data.customerName} · ${formatAmount(data.amountToPay)}`,
                    })
                    return
                }
            } catch {
                // ignore malformed messages
            }
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

    function handleStatusUpdate(orderId: number, status: TOrderStatus) {
        updateStatusMutation.mutate({ orderId, status })
    }

    function handleUpdateProofStatus(
        orderId: number,
        proofType: TProofType,
        status: TProofStatus,
    ) {
        updateProofStatusMutation.mutate({ orderId, proofType, status })
    }

    async function copyTrackingCode(publicId: string) {
        await navigator.clipboard.writeText(publicId)
        copiedPublicId = publicId
        setTimeout(() => (copiedPublicId = null), 2500)
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function proofStatusButtonClass(
        btnValue: TProofStatus,
        currentStatus: string | null,
    ): string {
        const active = btnValue === currentStatus
        if (btnValue === 'accepted')
            return active
                ? 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700'
                : 'border-emerald-600/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
        if (btnValue === 'fake')
            return active
                ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                : 'border-red-600/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        return active
            ? 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700'
            : 'border-blue-600/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
    }

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

    function isDeliveryUrgent(dateStr: string | null): boolean {
        if (!dateStr) return false
        const diff = new Date(dateStr).getTime() - Date.now()
        return diff > 0 && diff < 24 * 60 * 60 * 1000
    }
</script>

<main class="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-6 md:pt-0">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight">Orders</h1>
            <p class="text-muted-foreground text-sm">
                {#if ordersQuery.data}
                    {filteredOrders.length} of {activeOrderCount}
                    {activeOrderCount === 1 ? 'active order' : 'active orders'}
                {:else}
                    Manage active customer orders.
                {/if}
            </p>
        </div>
    </div>

    <!-- History callout -->
    <div
        class="flex items-center gap-2.5 rounded-lg border border-dashed px-3 py-2"
    >
        <HistoryIcon class="text-muted-foreground size-4 shrink-0" />
        <p class="text-muted-foreground text-sm">
            Completed and cancelled orders are in
            <a
                href="/app/admin/orders/history"
                class="font-medium underline underline-offset-4 hover:text-foreground transition-colors"
            >
                Order History
            </a>.
        </p>
    </div>

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

        <!-- Status pills (active statuses only) -->
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {#each [{ value: 'all', label: 'All Active' }, ...Object.entries(STATUS_LABELS)
                    .filter( ([value]) => ACTIVE_STATUSES.includes(value as TOrderStatus), )
                    .map( ([value, label]) => ({ value, label }), )] as pill (pill.value)}
                <button
                    type="button"
                    onclick={() =>
                        (filterStatus = pill.value as TOrderStatus | 'all')}
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
                        <Skeleton class="size-8 rounded-md" />
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
            Failed to load orders. Please refresh.
        </div>

        <!-- Empty -->
    {:else if filteredOrders.length === 0}
        <div
            class="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center"
        >
            <div class="bg-muted rounded-full p-5">
                <ShoppingCartIcon class="text-muted-foreground size-8" />
            </div>
            <div>
                <p class="font-semibold">No active orders found</p>
                <p class="text-muted-foreground mt-1 text-sm">
                    {#if searchQuery || filterStatus !== 'all'}
                        Try adjusting your search or filter.
                    {:else}
                        Active orders placed by customers will appear here.
                    {/if}
                </p>
            </div>
        </div>

        <!-- Cards -->
    {:else}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each filteredOrders as o (o.id)}
                <div
                    class="bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm transition-shadow hover:shadow-md"
                >
                    <!-- Card Header: status + actions -->
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
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                                {#snippet child({
                                    props,
                                }: {
                                    props: Record<string, unknown>
                                })}
                                    <Button
                                        {...props}
                                        variant="ghost"
                                        size="icon"
                                        class="size-8 shrink-0"
                                        aria-label="Order actions"
                                    >
                                        <EllipsisVerticalIcon class="size-4" />
                                    </Button>
                                {/snippet}
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content align="end">
                                <DropdownMenu.Item
                                    onclick={() => openDetailDialog(o)}
                                >
                                    View Details
                                </DropdownMenu.Item>
                                {#if STATUS_TRANSITIONS[o.status].length > 0}
                                    <DropdownMenu.Separator />
                                    {#each STATUS_TRANSITIONS[o.status] as nextStatus (nextStatus)}
                                        <DropdownMenu.Item
                                            onclick={() =>
                                                handleStatusUpdate(
                                                    o.id,
                                                    nextStatus,
                                                )}
                                            disabled={updateStatusMutation.isPending}
                                        >
                                            {STATUS_LABELS[nextStatus]}
                                        </DropdownMenu.Item>
                                    {/each}
                                {/if}
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    </div>

                    <!-- Delivery date banner -->
                    <div
                        class="mx-4 mb-3 flex items-center gap-2 rounded-lg border px-3 py-2
                        {o.deliveryAt
                            ? isDeliveryUrgent(o.deliveryAt)
                                ? 'border-orange-500/30 bg-orange-500/10'
                                : 'border-blue-500/20 bg-blue-500/5'
                            : 'border-dashed border-muted-foreground/20 bg-muted/40'}"
                    >
                        <CalendarClockIcon
                            class="size-3.5 shrink-0
                            {o.deliveryAt
                                ? isDeliveryUrgent(o.deliveryAt)
                                    ? 'text-orange-500'
                                    : 'text-blue-500'
                                : 'text-muted-foreground'}"
                        />
                        <span
                            class="truncate text-xs font-medium
                            {o.deliveryAt
                                ? isDeliveryUrgent(o.deliveryAt)
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : 'text-blue-600 dark:text-blue-400'
                                : 'text-muted-foreground'}"
                        >
                            {formatDelivery(o.deliveryAt)}
                        </span>
                    </div>

                    <!-- Customer info -->
                    <div class="flex flex-col gap-1 px-4 pb-3">
                        <!-- Tracking code box -->
                        <div
                            class="bg-muted/50 mb-2 rounded-xl border px-3 py-2.5"
                        >
                            <p
                                class="text-muted-foreground mb-0.5 text-[10px] font-medium uppercase tracking-widest"
                            >
                                Tracking Code
                            </p>
                            <div
                                class="flex items-center justify-between gap-2"
                            >
                                <p
                                    class="font-mono text-base font-black tracking-widest"
                                >
                                    {o.trackingCode}
                                </p>
                                <button
                                    type="button"
                                    onclick={() =>
                                        copyTrackingCode(o.trackingCode)}
                                    class="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                                    aria-label="Copy tracking code"
                                >
                                    {#if copiedPublicId === o.trackingCode}
                                        <CheckIcon
                                            class="size-3.5 text-emerald-500"
                                        />
                                    {:else}
                                        <CopyIcon class="size-3.5" />
                                    {/if}
                                </button>
                            </div>
                        </div>
                        <p class="font-semibold leading-snug">
                            {o.customerName}
                        </p>
                        <div class="flex flex-wrap gap-1.5 mt-0.5">
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
                                    <span class="leading-snug">
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
                            <span class="font-semibold tabular-nums"
                                >{formatAmount(o.amountToPay)}</span
                            >
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

                    <!-- Remaining balance payment status -->
                    {#if o.remainingBalancePaymentMethod}
                        <div class="border-t px-4 py-2.5">
                            {#if o.remainingBalancePaymentMethod === 'gcash'}
                                <div class="flex items-center gap-2">
                                    {#if o.remainingBalanceProofUrl}
                                        <button
                                            type="button"
                                            onclick={() =>
                                                openProofDialog(
                                                    o.remainingBalanceProofUrl!,
                                                )}
                                            class="size-8 shrink-0 overflow-hidden rounded-md border transition-opacity hover:opacity-80"
                                            aria-label="View remaining balance proof"
                                        >
                                            <img
                                                src={o.remainingBalanceProofUrl}
                                                alt="Remaining balance proof"
                                                class="size-full object-cover"
                                            />
                                        </button>
                                    {/if}
                                    <span
                                        class="text-xs font-medium text-blue-600 dark:text-blue-400"
                                        >GCash balance proof submitted</span
                                    >
                                </div>
                            {:else}
                                <span
                                    class="text-xs font-medium text-amber-600 dark:text-amber-400"
                                    >Cash on pickup — collect remaining balance</span
                                >
                            {/if}
                        </div>
                    {/if}

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
    <Dialog.Content class="flex max-h-[90dvh] flex-col gap-0 p-0 sm:max-w-lg">
        <Dialog.Header class="shrink-0 border-b px-6 py-4">
            <Dialog.Title>Order #{viewingOrder?.id}</Dialog.Title>
            <Dialog.Description>
                Placed on {viewingOrder
                    ? formatDate(viewingOrder.createdAt)
                    : ''}
            </Dialog.Description>
        </Dialog.Header>

        {#if viewingOrder}
            <div
                class="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 text-sm"
            >
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

                <!-- Tracking code box -->
                <div class="bg-muted/50 rounded-xl border px-4 py-3">
                    <p
                        class="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-widest"
                    >
                        Tracking Code
                    </p>
                    <div class="flex items-center justify-between gap-3">
                        <p
                            class="font-mono text-2xl font-black tracking-widest"
                        >
                            {viewingOrder.trackingCode}
                        </p>
                        <button
                            type="button"
                            onclick={() =>
                                copyTrackingCode(viewingOrder!.trackingCode)}
                            class="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors
                                {copiedPublicId === viewingOrder.trackingCode
                                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                                : 'text-muted-foreground hover:text-foreground'}"
                        >
                            {#if copiedPublicId === viewingOrder.trackingCode}
                                <CheckIcon class="size-3.5" />
                                Copied!
                            {:else}
                                <CopyIcon class="size-3.5" />
                                Copy
                            {/if}
                        </button>
                    </div>
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
                    <span class="font-medium"
                        >{formatDelivery(viewingOrder.deliveryAt)}</span
                    >

                    <span class="text-muted-foreground">Delivery Type</span>
                    <span
                        >{DELIVERY_TYPE_LABELS[viewingOrder.deliveryType]}</span
                    >

                    {#if viewingOrder.downpayment}
                        <span class="text-muted-foreground">Downpayment</span>
                        <span>{formatAmount(viewingOrder.downpayment)}</span>
                    {/if}

                    <span class="text-muted-foreground">Amount</span>
                    <span class="font-medium"
                        >{formatAmount(viewingOrder.amountToPay)}</span
                    >

                    {#if viewingOrder.downpayment}
                        <span class="text-muted-foreground"
                            >Remaining Balance</span
                        >
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
                                            · {item.sizeName}</span
                                        >
                                    {/if}
                                    <span class="text-muted-foreground">
                                        × {item.quantity}</span
                                    >
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
                        <div class="flex items-center justify-between mb-2">
                            <p class="text-muted-foreground text-xs">
                                Downpayment Proof
                            </p>
                            {#if viewingOrder.proofOfPaymentStatus}
                                <span
                                    class="rounded-full border px-2 py-0.5 text-xs font-medium
                                        {viewingOrder.proofOfPaymentStatus ===
                                    'accepted'
                                        ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : viewingOrder.proofOfPaymentStatus ===
                                            'fake'
                                          ? 'border-red-600/40 bg-red-500/10 text-red-600 dark:text-red-400'
                                          : 'border-blue-600/40 bg-blue-500/10 text-blue-600 dark:text-blue-400'}"
                                >
                                    {viewingOrder.proofOfPaymentStatus ===
                                    'accepted'
                                        ? 'Accepted'
                                        : viewingOrder.proofOfPaymentStatus ===
                                            'fake'
                                          ? 'Fake'
                                          : 'Received'}
                                </span>
                            {/if}
                        </div>
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
                        <div class="mt-2 flex gap-1.5">
                            {#each [['accepted', 'Accept'], ['fake', 'Fake'], ['received', 'Received']] as [TProofStatus, string][] as [val, label] (val)}
                                <button
                                    type="button"
                                    disabled={updateProofStatusMutation.isPending}
                                    onclick={() =>
                                        handleUpdateProofStatus(
                                            viewingOrder!.id,
                                            'downpayment',
                                            val,
                                        )}
                                    class="flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50
                                        {proofStatusButtonClass(
                                        val,
                                        viewingOrder.proofOfPaymentStatus,
                                    )}"
                                >
                                    {label}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if viewingOrder.remainingBalancePaymentMethod}
                    <Separator />
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center justify-between">
                            <p class="text-muted-foreground text-xs">
                                Remaining Balance Payment
                            </p>
                            {#if viewingOrder.remainingBalanceProofStatus}
                                <span
                                    class="rounded-full border px-2 py-0.5 text-xs font-medium
                                        {viewingOrder.remainingBalanceProofStatus ===
                                    'accepted'
                                        ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                        : viewingOrder.remainingBalanceProofStatus ===
                                            'fake'
                                          ? 'border-red-600/40 bg-red-500/10 text-red-600 dark:text-red-400'
                                          : 'border-blue-600/40 bg-blue-500/10 text-blue-600 dark:text-blue-400'}"
                                >
                                    {viewingOrder.remainingBalanceProofStatus ===
                                    'accepted'
                                        ? 'Accepted'
                                        : viewingOrder.remainingBalanceProofStatus ===
                                            'fake'
                                          ? 'Fake'
                                          : 'Received'}
                                </span>
                            {/if}
                        </div>
                        {#if viewingOrder.remainingBalancePaymentMethod === 'gcash'}
                            <div
                                class="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400"
                            >
                                GCash payment submitted
                            </div>

                            <!-- Sender details grid -->
                            {#if viewingOrder.remainingBalanceSenderName || viewingOrder.remainingBalanceSenderNumber || viewingOrder.remainingBalanceAmountSent}
                                <div
                                    class="grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-lg border px-3 py-2.5 text-xs"
                                >
                                    {#if viewingOrder.remainingBalanceSenderName}
                                        <span class="text-muted-foreground"
                                            >Sender Name</span
                                        >
                                        <span class="font-medium"
                                            >{viewingOrder.remainingBalanceSenderName}</span
                                        >
                                    {/if}
                                    {#if viewingOrder.remainingBalanceSenderNumber}
                                        <span class="text-muted-foreground"
                                            >Sender Number</span
                                        >
                                        <span class="font-mono font-medium"
                                            >{viewingOrder.remainingBalanceSenderNumber}</span
                                        >
                                    {/if}
                                    {#if viewingOrder.remainingBalanceAmountSent}
                                        <span class="text-muted-foreground"
                                            >Amount Sent</span
                                        >
                                        <span class="font-semibold tabular-nums"
                                            >{formatAmount(
                                                viewingOrder.remainingBalanceAmountSent,
                                            )}</span
                                        >
                                    {/if}
                                </div>
                            {/if}

                            {#if viewingOrder.remainingBalanceProofUrl}
                                <button
                                    type="button"
                                    onclick={() =>
                                        openProofDialog(
                                            viewingOrder!
                                                .remainingBalanceProofUrl!,
                                        )}
                                    class="hover:opacity-80 transition-opacity block"
                                    aria-label="View remaining balance proof"
                                >
                                    <img
                                        src={viewingOrder.remainingBalanceProofUrl}
                                        alt="Remaining balance proof"
                                        class="w-full max-h-48 rounded-lg object-contain border"
                                    />
                                </button>
                            {/if}
                        {:else}
                            <div
                                class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"
                            >
                                Cash on pickup — collect remaining balance
                            </div>
                        {/if}
                        <div class="flex gap-1.5">
                            {#each [['accepted', 'Accept'], ['fake', 'Fake'], ['received', 'Received']] as [TProofStatus, string][] as [val, label] (val)}
                                <button
                                    type="button"
                                    disabled={updateProofStatusMutation.isPending}
                                    onclick={() =>
                                        handleUpdateProofStatus(
                                            viewingOrder!.id,
                                            'remaining_balance',
                                            val,
                                        )}
                                    class="flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50
                                        {proofStatusButtonClass(
                                        val,
                                        viewingOrder.remainingBalanceProofStatus,
                                    )}"
                                >
                                    {label}
                                </button>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {/if}

        <div class="flex shrink-0 items-center justify-end border-t px-6 py-4">
            <Button
                variant="outline"
                onclick={() => (detailDialogOpen = false)}
            >
                Close
            </Button>
        </div>
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
