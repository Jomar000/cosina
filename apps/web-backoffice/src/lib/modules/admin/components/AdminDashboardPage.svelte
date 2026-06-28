<script lang="ts">
    import * as Card from '@cosina/ui/components/card'
    import { Skeleton } from '@cosina/ui/components/skeleton'
    import * as Tabs from '@cosina/ui/components/tabs'
    import BanknoteIcon from '@lucide/svelte/icons/banknote'
    import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2'
    import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
    import XCircleIcon from '@lucide/svelte/icons/x-circle'
    import { createQuery, useQueryClient } from '@tanstack/svelte-query'

    import { adminClient } from '$lib/clients'
    import { wsClientManager } from '$lib/utilities/wsClientManager'

    import OrderStatusChart from './OrderStatusChart.svelte'
    import RevenueChart from './RevenueChart.svelte'

    ///////////////////
    // 02. Constants //
    ///////////////////

    type TPeriod = 'day' | 'week' | 'month'

    const PERIOD_LABELS: Record<TPeriod, string> = {
        day: 'Last 24 Hours',
        week: 'Last 7 Days',
        month: 'Last 30 Days',
    }

    ///////////////
    // 03. State //
    ///////////////

    let selectedPeriod = $state<TPeriod>('week')

    const queryClient = useQueryClient()

    /////////////////
    // 05. Queries //
    /////////////////

    const statsQuery = createQuery(() => ({
        queryKey: [
            'admin',
            'dashboard',
            'stats',
            selectedPeriod,
        ],
        queryFn: async () => {
            const response = await adminClient.dashboard.stats.$get({
                query: { period: selectedPeriod },
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data
        },
    }))

    /////////////////
    // 04. Derived //
    /////////////////

    type TChartPoint = { label: string; value: number }

    const chartData = $derived.by((): TChartPoint[] => {
        const stats = statsQuery.data
        if (!stats) return []

        const { period, startEpoch, earningsSeries } = stats
        const slotCount = period === 'day' ? 24 : period === 'week' ? 7 : 30
        const slotStep = period === 'day' ? 3600 : 86400

        const earningsMap: Record<number, number> = Object.fromEntries(
            earningsSeries.map((e: { periodEpoch: number; total: string }) => [
                e.periodEpoch,
                Number(e.total),
            ]),
        )

        return Array.from({ length: slotCount }, (_, i) => {
            const slotEpoch = startEpoch + i * slotStep
            const value = earningsMap[slotEpoch] ?? 0
            const date = new Date(slotEpoch * 1000)

            let label: string
            if (period === 'day') {
                const raw = date.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    hour12: true,
                })
                label = i % 6 === 0 || i === slotCount - 1 ? raw : ''
            } else if (period === 'week') {
                label = date.toLocaleDateString('en-US', { weekday: 'short' })
            } else {
                const raw = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                })
                label = i % 5 === 0 || i === slotCount - 1 ? raw : ''
            }

            return { label, value }
        })
    })

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        const ws = wsClientManager.connect('orders')

        function handleMessage(event: MessageEvent) {
            try {
                const { event: eventType } = JSON.parse(event.data) as {
                    event: string
                }
                const ORDER_MUTATION_EVENTS = [
                    'order.statusUpdate',
                    'order.create',
                    'order.update',
                    'order.delete',
                ]
                if (ORDER_MUTATION_EVENTS.includes(eventType)) {
                    // Invalidate all period variants of the dashboard stats
                    queryClient.invalidateQueries({
                        queryKey: [
                            'admin',
                            'dashboard',
                            'stats',
                        ],
                    })
                }
            } catch {
                // ignore malformed messages
            }
        }

        ws.addEventListener('message', handleMessage)

        return () => {
            ws.removeEventListener('message', handleMessage)
            ws.release()
        }
    })

    /////////////////
    // 10. Helpers //
    /////////////////

    function formatAmount(amount: string | number) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(Number(amount))
    }
</script>

<main class="flex flex-1 flex-col gap-6 p-4 pt-2 md:p-6">
    <!-- Page header -->
    <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
            <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20"
            >
                <LayoutDashboardIcon class="size-5 text-blue-400" />
            </div>
            <div>
                <h1 class="text-xl font-bold tracking-tight">Dashboard</h1>
                <p class="text-muted-foreground text-sm">
                    Sales and order overview for your store.
                </p>
            </div>
        </div>
        <Tabs.Root bind:value={selectedPeriod}>
            <Tabs.List class="h-8">
                {#each Object.entries(PERIOD_LABELS) as [value, label] (value)}
                    <Tabs.Trigger
                        {value}
                        class="text-xs px-3 h-full">{label}</Tabs.Trigger
                    >
                {/each}
            </Tabs.List>
        </Tabs.Root>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <!-- Total Revenue -->
        <div
            class="relative overflow-hidden rounded-xl border border-blue-500/20 bg-blue-500/5 p-5"
        >
            <div
                class="absolute inset-0 bg-linear-to-br from-blue-500/8 via-transparent to-transparent pointer-events-none"
            ></div>
            <div class="relative flex items-start justify-between">
                <p class="text-xs font-medium text-zinc-400">Total Revenue</p>
                <div class="shrink-0 rounded-lg bg-blue-500/15 p-2">
                    <BanknoteIcon class="size-4 text-blue-400" />
                </div>
            </div>
            <div class="relative mt-3">
                {#if statsQuery.isPending}
                    <Skeleton class="mb-2 h-8 w-36" />
                    <Skeleton class="h-3 w-24" />
                {:else if statsQuery.isError}
                    <p class="text-destructive text-sm font-medium">
                        Failed to load
                    </p>
                {:else}
                    <p
                        class="text-3xl font-bold tabular-nums tracking-tight text-zinc-100"
                    >
                        {formatAmount(statsQuery.data.totalEarnings)}
                    </p>
                    <p class="mt-1 text-xs text-zinc-500">
                        {PERIOD_LABELS[selectedPeriod]}
                    </p>
                {/if}
            </div>
        </div>

        <!-- Completed -->
        <div
            class="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5"
        >
            <div
                class="absolute inset-0 bg-linear-to-br from-emerald-500/8 via-transparent to-transparent pointer-events-none"
            ></div>
            <div class="relative flex items-start justify-between">
                <p class="text-xs font-medium text-zinc-400">
                    Completed Orders
                </p>
                <div class="shrink-0 rounded-lg bg-emerald-500/15 p-2">
                    <CheckCircle2Icon class="size-4 text-emerald-400" />
                </div>
            </div>
            <div class="relative mt-3">
                {#if statsQuery.isPending}
                    <Skeleton class="mb-2 h-8 w-16" />
                    <Skeleton class="h-3 w-24" />
                {:else if statsQuery.isError}
                    <p class="text-destructive text-sm font-medium">
                        Failed to load
                    </p>
                {:else}
                    <p
                        class="text-3xl font-bold tabular-nums tracking-tight text-zinc-100"
                    >
                        {statsQuery.data.completedCount}
                    </p>
                    <p class="mt-1 text-xs text-zinc-500">
                        {PERIOD_LABELS[selectedPeriod]}
                    </p>
                {/if}
            </div>
        </div>

        <!-- Cancelled -->
        <div
            class="relative overflow-hidden rounded-xl border border-rose-500/20 bg-rose-500/5 p-5"
        >
            <div
                class="absolute inset-0 bg-linear-to-br from-rose-500/8 via-transparent to-transparent pointer-events-none"
            ></div>
            <div class="relative flex items-start justify-between">
                <p class="text-xs font-medium text-zinc-400">
                    Cancelled Orders
                </p>
                <div class="shrink-0 rounded-lg bg-rose-500/15 p-2">
                    <XCircleIcon class="size-4 text-rose-400" />
                </div>
            </div>
            <div class="relative mt-3">
                {#if statsQuery.isPending}
                    <Skeleton class="mb-2 h-8 w-16" />
                    <Skeleton class="h-3 w-24" />
                {:else if statsQuery.isError}
                    <p class="text-destructive text-sm font-medium">
                        Failed to load
                    </p>
                {:else}
                    <p
                        class="text-3xl font-bold tabular-nums tracking-tight text-zinc-100"
                    >
                        {statsQuery.data.cancelledCount}
                    </p>
                    <p class="mt-1 text-xs text-zinc-500">
                        {PERIOD_LABELS[selectedPeriod]}
                    </p>
                {/if}
            </div>
        </div>
    </div>

    <!-- Charts row -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <Card.Root class="border-zinc-800 bg-zinc-900/50">
            <Card.Header class="border-b border-zinc-800 pb-4">
                <Card.Title class="text-sm font-medium text-zinc-200"
                    >Order Status</Card.Title
                >
                <Card.Description class="text-xs text-zinc-500">
                    Completed vs. cancelled — {PERIOD_LABELS[selectedPeriod]}
                </Card.Description>
            </Card.Header>
            <Card.Content class="pt-2">
                <OrderStatusChart
                    completedCount={statsQuery.data?.completedCount ?? 0}
                    cancelledCount={statsQuery.data?.cancelledCount ?? 0}
                    loading={statsQuery.isPending}
                    error={statsQuery.isError}
                />
            </Card.Content>
        </Card.Root>

        <Card.Root class="border-zinc-800 bg-zinc-900/50">
            <Card.Header class="border-b border-zinc-800 pb-4">
                <Card.Title class="text-sm font-medium text-zinc-200">
                    Revenue — {PERIOD_LABELS[selectedPeriod]}
                </Card.Title>
                <Card.Description class="text-xs text-zinc-500">
                    Completed order totals by {selectedPeriod === 'day'
                        ? 'hour'
                        : 'day'}
                </Card.Description>
            </Card.Header>
            <Card.Content class="pt-2">
                <RevenueChart
                    {chartData}
                    period={selectedPeriod}
                    loading={statsQuery.isPending}
                    error={statsQuery.isError}
                />
            </Card.Content>
        </Card.Root>
    </div>
</main>
