<script lang="ts">
    import * as Card from '@hyperion/ui/components/card'
    import { Skeleton } from '@hyperion/ui/components/skeleton'
    import * as Tabs from '@hyperion/ui/components/tabs'
    import BanknoteIcon from '@lucide/svelte/icons/banknote'
    import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2'
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

<main class="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-6 md:pt-0">
    <!-- Page header -->
    <div>
        <h1 class="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p class="text-muted-foreground text-sm">
            Sales and order overview for your store.
        </p>
    </div>

    <!-- Period selector -->
    <Tabs.Root bind:value={selectedPeriod}>
        <Tabs.List class="w-fit">
            {#each Object.entries(PERIOD_LABELS) as [value, label] (value)}
                <Tabs.Trigger
                    {value}
                    class="text-xs">{label}</Tabs.Trigger
                >
            {/each}
        </Tabs.List>
    </Tabs.Root>

    <!-- Stat cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <!-- Total Revenue -->
        <Card.Root class="relative overflow-hidden">
            <div
                class="from-primary/5 absolute inset-0 bg-linear-to-br via-transparent to-transparent"
            ></div>
            <Card.Header
                class="relative flex flex-row items-start justify-between pb-2"
            >
                <Card.Description>Total Revenue</Card.Description>
                <div class="bg-primary/10 shrink-0 rounded-lg p-2">
                    <BanknoteIcon class="text-primary size-4" />
                </div>
            </Card.Header>
            <Card.Content class="relative">
                {#if statsQuery.isPending}
                    <Skeleton class="mb-2 h-8 w-36" />
                    <Skeleton class="h-3 w-24" />
                {:else if statsQuery.isError}
                    <p class="text-destructive text-sm font-medium">
                        Failed to load
                    </p>
                {:else}
                    <p class="text-3xl font-bold tabular-nums tracking-tight">
                        {formatAmount(statsQuery.data.totalEarnings)}
                    </p>
                    <p class="text-muted-foreground mt-1 text-xs">
                        {PERIOD_LABELS[selectedPeriod]}
                    </p>
                {/if}
            </Card.Content>
        </Card.Root>

        <!-- Completed -->
        <Card.Root class="relative overflow-hidden">
            <div
                class="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-transparent"
            ></div>
            <Card.Header
                class="relative flex flex-row items-start justify-between pb-2"
            >
                <Card.Description>Completed Orders</Card.Description>
                <div class="shrink-0 rounded-lg bg-emerald-500/10 p-2">
                    <CheckCircle2Icon class="size-4 text-emerald-500" />
                </div>
            </Card.Header>
            <Card.Content class="relative">
                {#if statsQuery.isPending}
                    <Skeleton class="mb-2 h-8 w-16" />
                    <Skeleton class="h-3 w-24" />
                {:else if statsQuery.isError}
                    <p class="text-destructive text-sm font-medium">
                        Failed to load
                    </p>
                {:else}
                    <p class="text-3xl font-bold tabular-nums tracking-tight">
                        {statsQuery.data.completedCount}
                    </p>
                    <p class="text-muted-foreground mt-1 text-xs">
                        {PERIOD_LABELS[selectedPeriod]}
                    </p>
                {/if}
            </Card.Content>
        </Card.Root>

        <!-- Cancelled -->
        <Card.Root class="relative overflow-hidden">
            <div
                class="absolute inset-0 bg-linear-to-br from-rose-500/5 via-transparent to-transparent"
            ></div>
            <Card.Header
                class="relative flex flex-row items-start justify-between pb-2"
            >
                <Card.Description>Cancelled Orders</Card.Description>
                <div class="shrink-0 rounded-lg bg-rose-500/10 p-2">
                    <XCircleIcon class="size-4 text-rose-500" />
                </div>
            </Card.Header>
            <Card.Content class="relative">
                {#if statsQuery.isPending}
                    <Skeleton class="mb-2 h-8 w-16" />
                    <Skeleton class="h-3 w-24" />
                {:else if statsQuery.isError}
                    <p class="text-destructive text-sm font-medium">
                        Failed to load
                    </p>
                {:else}
                    <p class="text-3xl font-bold tabular-nums tracking-tight">
                        {statsQuery.data.cancelledCount}
                    </p>
                    <p class="text-muted-foreground mt-1 text-xs">
                        {PERIOD_LABELS[selectedPeriod]}
                    </p>
                {/if}
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Charts row: donut first in DOM (visible on mobile without scrolling),
         revenue first visually on desktop via lg:order-* -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        <!-- Order status donut — left on desktop, top on mobile -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <Card.Title class="text-sm font-medium">Order Status</Card.Title
                >
                <Card.Description class="text-xs">
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

        <!-- Revenue bar chart — right on desktop, bottom on mobile -->
        <Card.Root>
            <Card.Header class="border-b pb-4">
                <Card.Title class="text-sm font-medium">
                    Revenue — {PERIOD_LABELS[selectedPeriod]}
                </Card.Title>
                <Card.Description class="text-xs">
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
