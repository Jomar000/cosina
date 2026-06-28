<script lang="ts">
    import { Button } from '@cosina/ui/components/button'
    import { Skeleton } from '@cosina/ui/components/skeleton'
    import * as Tabs from '@cosina/ui/components/tabs'
    import * as Tooltip from '@cosina/ui/components/tooltip'
    import CheckIcon from '@lucide/svelte/icons/check'
    import FilterIcon from '@lucide/svelte/icons/filter'
    import InboxIcon from '@lucide/svelte/icons/inbox'
    import MessageCircleHeartIcon from '@lucide/svelte/icons/message-circle-heart'
    import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
    import StarIcon from '@lucide/svelte/icons/star'
    import XIcon from '@lucide/svelte/icons/x'
    import {
        createMutation,
        createQuery,
        useQueryClient,
    } from '@tanstack/svelte-query'
    import { SvelteSet } from 'svelte/reactivity'
    import { toast } from 'svelte-sonner'

    import { adminClient } from '$lib/clients'
    import { wsClientManager } from '$lib/utilities/wsClientManager'

    ///////////////////
    // 02. Constants //
    ///////////////////

    type TFeedbackStatus = 'pending' | 'published' | 'rejected'

    type TFeedback = {
        id: number
        publicId: string
        rating: number
        comment: string | null
        status: TFeedbackStatus
        createdAt: string
        customerName: string
        userEmail: string | null
    }

    type TTab = { value: TFeedbackStatus | 'all'; label: string }

    const TABS: TTab[] = [
        { value: 'all', label: 'All' },
        { value: 'pending', label: 'Pending' },
        { value: 'published', label: 'Published' },
        { value: 'rejected', label: 'Rejected' },
    ]

    const COMMENT_CLIP = 140

    ///////////////
    // 03. State //
    ///////////////

    let statusFilter = $state<TFeedbackStatus | 'all'>('all')
    const expandedIds = new SvelteSet<number>()
    let updatingId = $state<number | null>(null)
    let wsConnected = $state(false)

    const queryClient = useQueryClient()

    /////////////////
    // 05. Queries //
    /////////////////

    const feedbackQuery = createQuery(() => ({
        queryKey: [
            'admin',
            'feedback',
            'all',
        ],
        queryFn: async () => {
            const response = await adminClient.feedback.readMany.$get({
                query: { sortOrder: 'desc', limit: '100' },
            })
            const json = await response.json()
            if (!json.success) throw new Error(json.error.message)
            return json.data as TFeedback[]
        },
    }))

    ///////////////////
    // 06. Mutations //
    ///////////////////

    const updateStatusMutation = createMutation(() => ({
        mutationKey: [
            'admin',
            'feedback',
            'updateStatus',
        ],
        mutationFn: async ({
            feedbackId,
            status,
        }: {
            feedbackId: number
            status: TFeedbackStatus
        }) => {
            updatingId = feedbackId
            const response = await adminClient.feedback.updateStatus.$post({
                json: { feedbackId, status },
            })
            const json = await response.json()
            if (!json.success) throw new Error(json.error.message)
        },
        onSuccess: (_, { status }) => {
            const msg =
                status === 'published'
                    ? 'Review published to website'
                    : status === 'rejected'
                      ? 'Review rejected'
                      : 'Review reset to pending'
            toast.success(msg)
            queryClient.invalidateQueries({
                queryKey: [
                    'admin',
                    'feedback',
                ],
            })
        },
        onError: (err: Error) => {
            toast.error('Update failed', { description: err.message })
        },
        onSettled: () => {
            updatingId = null
        },
    }))

    /////////////////
    // 04. Derived //
    /////////////////

    const allRows = $derived(feedbackQuery.data ?? [])

    const rows = $derived(
        statusFilter === 'all'
            ? allRows
            : allRows.filter((r) => r.status === statusFilter),
    )

    const stats = $derived({
        total: allRows.length,
        pending: allRows.filter((r) => r.status === 'pending').length,
        published: allRows.filter((r) => r.status === 'published').length,
        rejected: allRows.filter((r) => r.status === 'rejected').length,
        avgRating: allRows.length
            ? allRows.reduce((s, r) => s + r.rating, 0) / allRows.length
            : 0,
    })

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        const ws = wsClientManager.connect('feedback')

        function handleOpen() {
            wsConnected = true
        }
        function handleClose() {
            wsConnected = false
        }
        function handleMessage(event: MessageEvent) {
            try {
                const { event: eventType } = JSON.parse(event.data)
                if (eventType === 'feedback.create') {
                    toast.info('New review received!', {
                        description: 'A customer just submitted feedback.',
                    })
                }
                if (
                    eventType === 'feedback.create' ||
                    eventType === 'feedback.statusUpdate'
                ) {
                    queryClient.invalidateQueries({
                        queryKey: [
                            'admin',
                            'feedback',
                        ],
                    })
                }
            } catch {
                // ignore malformed messages
            }
        }

        ws.addEventListener('open', handleOpen)
        ws.addEventListener('close', handleClose)
        ws.addEventListener('message', handleMessage)

        return () => {
            ws.removeEventListener('open', handleOpen)
            ws.removeEventListener('close', handleClose)
            ws.removeEventListener('message', handleMessage)
            ws.release()
        }
    })

    /////////////////
    // 10. Helpers //
    /////////////////

    function initials(name: string) {
        return name
            .split(' ')
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase() ?? '')
            .join('')
    }

    function formatDate(iso: string) {
        return new Date(iso).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    function avatarColorClass(name: string): string {
        const palettes = [
            'bg-blue-500/15 text-blue-400 ring-blue-500/25',
            'bg-emerald-500/15 text-emerald-400 ring-emerald-500/25',
            'bg-violet-500/15 text-violet-400 ring-violet-500/25',
            'bg-amber-500/15 text-amber-400 ring-amber-500/25',
            'bg-rose-500/15 text-rose-400 ring-rose-500/25',
            'bg-cyan-500/15 text-cyan-400 ring-cyan-500/25',
            'bg-orange-500/15 text-orange-400 ring-orange-500/25',
        ]
        const code = name.charCodeAt(0) + (name.charCodeAt(1) ?? 0)
        return palettes[code % palettes.length]
    }

    function statusCfg(status: TFeedbackStatus) {
        const map = {
            pending: {
                label: 'Pending',
                badgeClass:
                    'border-amber-500/30 bg-amber-500/10 text-amber-400',
                dotClass: 'bg-amber-400',
            },
            published: {
                label: 'Published',
                badgeClass:
                    'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                dotClass: 'bg-emerald-400',
            },
            rejected: {
                label: 'Rejected',
                badgeClass: 'border-red-500/30 bg-red-500/10 text-red-400',
                dotClass: 'bg-red-400',
            },
        }
        return map[status]
    }

    function toggleExpand(id: number) {
        if (expandedIds.has(id)) {
            expandedIds.delete(id)
        } else {
            expandedIds.add(id)
        }
    }

    function tabCount(value: TFeedbackStatus | 'all'): number {
        if (value === 'all') return stats.total
        if (value === 'pending') return stats.pending
        if (value === 'published') return stats.published
        return stats.rejected
    }

    function tabCountClass(value: TFeedbackStatus | 'all'): string {
        if (value === 'pending') return 'bg-amber-500/20 text-amber-400'
        if (value === 'published') return 'bg-emerald-500/20 text-emerald-400'
        if (value === 'rejected') return 'bg-red-500/20 text-red-400'
        return 'bg-muted text-muted-foreground'
    }
</script>

<Tooltip.Provider delayDuration={300}>
    <div
        class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:gap-8 sm:px-6 md:py-8 lg:px-8"
    >
        <!-- ── Page Header ── -->
        <div
            class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <div class="flex items-center gap-4">
                <div
                    class="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20"
                >
                    <div
                        class="absolute inset-0 rounded-xl bg-linear-to-br from-blue-500/15 via-transparent to-transparent"
                    ></div>
                    <MessageCircleHeartIcon
                        class="relative size-6 text-blue-400"
                    />
                </div>
                <div>
                    <h1
                        class="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
                    >
                        Customer Feedback
                    </h1>
                    <p class="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                        Moderate reviews before they appear on the public site.
                    </p>
                </div>
            </div>

            <!-- WS live indicator -->
            <div
                class="flex w-fit items-center gap-2 rounded-full border bg-card px-3.5 py-1.5 text-xs font-medium shadow-sm"
            >
                <span
                    class="relative flex size-2.5 shrink-0 items-center justify-center"
                >
                    {#if wsConnected}
                        <span
                            class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60"
                        ></span>
                    {/if}
                    <span
                        class="relative inline-flex size-2 rounded-full {wsConnected
                            ? 'bg-emerald-400'
                            : 'bg-muted-foreground/30'}"
                    ></span>
                </span>
                <span
                    class={wsConnected
                        ? 'text-emerald-400'
                        : 'text-muted-foreground'}
                >
                    {wsConnected ? 'Live' : 'Connecting...'}
                </span>
            </div>
        </div>

        <!-- ── Stat Cards ── -->
        {#if feedbackQuery.isPending}
            <div
                class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5"
            >
                {#each [0, 1, 2, 3, 4] as i (i)}
                    <Skeleton class="h-24 rounded-xl" />
                {/each}
            </div>
        {:else if allRows.length > 0}
            <div
                class="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5"
            >
                <!-- Total -->
                <div
                    class="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
                >
                    <div
                        class="absolute inset-0 bg-linear-to-br from-muted/60 via-transparent to-transparent pointer-events-none"
                    ></div>
                    <div
                        class="relative flex items-start justify-between gap-2"
                    >
                        <p
                            class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
                        >
                            Total
                        </p>
                    </div>
                    <p
                        class="relative mt-2 text-2xl font-bold tabular-nums text-foreground sm:text-3xl"
                    >
                        {stats.total}
                    </p>
                </div>

                <!-- Pending -->
                <div
                    class="relative overflow-hidden rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 shadow-sm sm:p-5"
                >
                    <div
                        class="absolute inset-0 bg-linear-to-br from-amber-500/10 via-transparent to-transparent pointer-events-none"
                    ></div>
                    <div
                        class="relative flex items-start justify-between gap-2"
                    >
                        <p
                            class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
                        >
                            Pending
                        </p>
                        {#if stats.pending > 0}
                            <span
                                class="shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400"
                            >
                                New
                            </span>
                        {/if}
                    </div>
                    <p
                        class="relative mt-2 text-2xl font-bold tabular-nums text-amber-400 sm:text-3xl"
                    >
                        {stats.pending}
                    </p>
                </div>

                <!-- Published -->
                <div
                    class="relative overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 shadow-sm sm:p-5"
                >
                    <div
                        class="absolute inset-0 bg-linear-to-br from-emerald-500/10 via-transparent to-transparent pointer-events-none"
                    ></div>
                    <p
                        class="relative text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
                    >
                        Published
                    </p>
                    <p
                        class="relative mt-2 text-2xl font-bold tabular-nums text-emerald-400 sm:text-3xl"
                    >
                        {stats.published}
                    </p>
                </div>

                <!-- Rejected -->
                <div
                    class="relative overflow-hidden rounded-xl border border-red-500/20 bg-red-500/5 p-4 shadow-sm sm:p-5"
                >
                    <div
                        class="absolute inset-0 bg-linear-to-br from-red-500/10 via-transparent to-transparent pointer-events-none"
                    ></div>
                    <p
                        class="relative text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
                    >
                        Rejected
                    </p>
                    <p
                        class="relative mt-2 text-2xl font-bold tabular-nums text-red-400 sm:text-3xl"
                    >
                        {stats.rejected}
                    </p>
                </div>

                <!-- Avg Rating -->
                <div
                    class="relative col-span-2 overflow-hidden rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 shadow-sm sm:p-5 md:col-span-1"
                >
                    <div
                        class="absolute inset-0 bg-linear-to-br from-blue-500/10 via-transparent to-transparent pointer-events-none"
                    ></div>
                    <p
                        class="relative text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs"
                    >
                        Avg Rating
                    </p>
                    <div class="relative mt-2 flex items-center gap-2">
                        <span
                            class="text-2xl font-bold tabular-nums text-blue-400 sm:text-3xl"
                        >
                            {stats.avgRating.toFixed(1)}
                        </span>
                        <div class="flex gap-0.5">
                            {#each [1, 2, 3, 4, 5] as s (s)}
                                <StarIcon
                                    class="size-3.5 sm:size-4 {stats.avgRating >=
                                    s
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-none text-muted-foreground/30'}"
                                />
                            {/each}
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <!-- ── Filter & List ── -->
        <div class="flex flex-col gap-5">
            <!-- Mobile filter dropdown -->
            <div class="relative sm:hidden">
                <FilterIcon
                    class="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <select
                    bind:value={statusFilter}
                    class="h-10 w-full appearance-none rounded-xl border border-border bg-card pl-9 pr-10 text-sm font-medium text-foreground shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                    {#each TABS as tab (tab.value)}
                        <option value={tab.value}>
                            {tab.label} ({tabCount(tab.value)})
                        </option>
                    {/each}
                </select>
                <svg
                    class="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </div>

            <!-- Desktop tab bar -->
            <div class="hidden w-full border-b pb-px sm:block">
                <Tabs.Root bind:value={statusFilter}>
                    <Tabs.List
                        class="flex h-12 w-full justify-start bg-transparent p-0"
                    >
                        {#each TABS as tab (tab.value)}
                            <Tabs.Trigger
                                value={tab.value}
                                class="relative h-12 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-blue-500 data-[state=active]:text-foreground data-[state=active]:shadow-none sm:px-6"
                            >
                                <div class="flex items-center gap-2">
                                    {tab.label}
                                    {#if tabCount(tab.value) > 0 || tab.value === 'all'}
                                        <span
                                            class="inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums {tabCountClass(
                                                tab.value,
                                            )}"
                                        >
                                            {tabCount(tab.value)}
                                        </span>
                                    {/if}
                                </div>
                            </Tabs.Trigger>
                        {/each}
                    </Tabs.List>
                </Tabs.Root>
            </div>

            <!-- List -->
            {#if feedbackQuery.isPending}
                <div class="flex flex-col gap-4">
                    {#each [0, 1, 2, 3] as i (i)}
                        <Skeleton class="h-40 w-full rounded-xl" />
                    {/each}
                </div>
            {:else if rows.length === 0}
                <div
                    class="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/50 py-20 text-center sm:py-28"
                >
                    <div
                        class="flex size-14 items-center justify-center rounded-full bg-blue-500/10 ring-1 ring-blue-500/20 sm:size-16"
                    >
                        <InboxIcon class="size-6 text-blue-400 sm:size-7" />
                    </div>
                    <h3
                        class="mt-4 text-base font-semibold text-foreground sm:text-lg"
                    >
                        No {statusFilter !== 'all' ? statusFilter : ''} reviews
                    </h3>
                    <p
                        class="mt-2 max-w-xs text-xs text-muted-foreground sm:text-sm"
                    >
                        {#if statusFilter === 'pending'}
                            You're all caught up! No reviews are waiting for
                            moderation.
                        {:else if statusFilter === 'published'}
                            No reviews have been approved and published yet.
                        {:else if statusFilter === 'rejected'}
                            No reviews have been rejected.
                        {:else}
                            Customer reviews will appear here once submitted.
                        {/if}
                    </p>
                </div>
            {:else}
                <div class="flex flex-col gap-3 sm:gap-4">
                    {#each rows as row (row.id)}
                        {@const cfg = statusCfg(row.status)}
                        {@const isUpdating = updatingId === row.id}
                        {@const isExpanded = expandedIds.has(row.id)}
                        {@const commentLong =
                            (row.comment?.length ?? 0) > COMMENT_CLIP}

                        <div
                            class="group overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm transition-all duration-200 hover:border-border hover:shadow-md"
                        >
                            <div class="flex flex-col md:flex-row">
                                <!-- ── Main content ── -->
                                <div
                                    class="flex flex-1 flex-col gap-4 p-4 sm:p-5 md:p-6"
                                >
                                    <!-- Top row: avatar + name + status badge -->
                                    <div
                                        class="flex items-start justify-between gap-3"
                                    >
                                        <div class="flex items-center gap-3">
                                            <div
                                                class="flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1 sm:size-11 sm:text-sm {avatarColorClass(
                                                    row.customerName,
                                                )}"
                                            >
                                                {initials(row.customerName)}
                                            </div>
                                            <div
                                                class="flex flex-col leading-tight"
                                            >
                                                <span
                                                    class="text-sm font-semibold text-foreground sm:text-base"
                                                >
                                                    {row.customerName}
                                                </span>
                                                <span
                                                    class="text-xs text-muted-foreground"
                                                >
                                                    {row.userEmail ||
                                                        'Guest User'}
                                                </span>
                                            </div>
                                        </div>

                                        <div
                                            class="flex shrink-0 flex-col items-end gap-1.5"
                                        >
                                            <span
                                                class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide {cfg.badgeClass}"
                                            >
                                                <span
                                                    class="size-1.5 rounded-full {cfg.dotClass}"
                                                ></span>
                                                {cfg.label}
                                            </span>
                                            <span
                                                class="text-[10px] text-muted-foreground"
                                            >
                                                {formatDate(row.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Stars -->
                                    <div class="flex items-center gap-2">
                                        <div class="flex gap-0.5">
                                            {#each [1, 2, 3, 4, 5] as s (s)}
                                                <StarIcon
                                                    class="size-3.5 sm:size-4 {row.rating >=
                                                    s
                                                        ? 'fill-yellow-400 text-yellow-400'
                                                        : 'fill-none text-muted-foreground/20'}"
                                                />
                                            {/each}
                                        </div>
                                        <span
                                            class="text-xs font-semibold tabular-nums text-muted-foreground"
                                        >
                                            {row.rating}.0
                                        </span>
                                    </div>

                                    <!-- Comment -->
                                    <div
                                        class="rounded-lg border border-border/40 bg-muted/30 p-3 sm:p-4"
                                    >
                                        {#if row.comment}
                                            <p
                                                class="text-xs/relaxed text-foreground sm:text-sm {commentLong &&
                                                !isExpanded
                                                    ? 'line-clamp-2'
                                                    : ''}"
                                            >
                                                &ldquo;{row.comment}&rdquo;
                                            </p>
                                            {#if commentLong}
                                                <button
                                                    type="button"
                                                    class="mt-2 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300 hover:underline"
                                                    onclick={() =>
                                                        toggleExpand(row.id)}
                                                >
                                                    {isExpanded
                                                        ? 'View less'
                                                        : 'Read full review'}
                                                </button>
                                            {/if}
                                        {:else}
                                            <p
                                                class="text-xs italic text-muted-foreground/50 sm:text-sm"
                                            >
                                                No written comment provided.
                                            </p>
                                        {/if}
                                    </div>
                                </div>

                                <!-- ── Action panel ── -->
                                <div
                                    class="flex flex-row flex-wrap items-center justify-end gap-2 border-t border-border/50 bg-muted/10 p-3 sm:p-4 md:w-44 md:flex-col md:items-stretch md:justify-center md:border-l md:border-t-0 md:p-5"
                                >
                                    {#if row.status !== 'published'}
                                        <Tooltip.Root>
                                            <Tooltip.Trigger class="contents">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    class="flex-1 gap-1.5 border-emerald-500/30 bg-transparent text-emerald-400 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300 md:flex-none md:w-full"
                                                    disabled={isUpdating ||
                                                        updateStatusMutation.isPending}
                                                    onclick={() =>
                                                        updateStatusMutation.mutate(
                                                            {
                                                                feedbackId:
                                                                    row.id,
                                                                status: 'published',
                                                            },
                                                        )}
                                                >
                                                    <CheckIcon
                                                        class="size-3.5"
                                                    />
                                                    Publish
                                                </Button>
                                            </Tooltip.Trigger>
                                            <Tooltip.Content side="left">
                                                Approve and show publicly
                                            </Tooltip.Content>
                                        </Tooltip.Root>
                                    {/if}

                                    {#if row.status !== 'rejected'}
                                        <Tooltip.Root>
                                            <Tooltip.Trigger class="contents">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    class="flex-1 gap-1.5 border-red-500/30 bg-transparent text-red-400 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300 md:flex-none md:w-full"
                                                    disabled={isUpdating ||
                                                        updateStatusMutation.isPending}
                                                    onclick={() =>
                                                        updateStatusMutation.mutate(
                                                            {
                                                                feedbackId:
                                                                    row.id,
                                                                status: 'rejected',
                                                            },
                                                        )}
                                                >
                                                    <XIcon class="size-3.5" />
                                                    Reject
                                                </Button>
                                            </Tooltip.Trigger>
                                            <Tooltip.Content side="left">
                                                Hide from public view
                                            </Tooltip.Content>
                                        </Tooltip.Root>
                                    {/if}

                                    {#if row.status !== 'pending'}
                                        <Tooltip.Root>
                                            <Tooltip.Trigger class="contents">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    class="flex-1 gap-1.5 text-muted-foreground hover:bg-muted hover:text-foreground md:flex-none md:w-full"
                                                    disabled={isUpdating ||
                                                        updateStatusMutation.isPending}
                                                    onclick={() =>
                                                        updateStatusMutation.mutate(
                                                            {
                                                                feedbackId:
                                                                    row.id,
                                                                status: 'pending',
                                                            },
                                                        )}
                                                >
                                                    <RotateCcwIcon
                                                        class="size-3.5"
                                                    />
                                                    Reset
                                                </Button>
                                            </Tooltip.Trigger>
                                            <Tooltip.Content side="left">
                                                Send back to pending queue
                                            </Tooltip.Content>
                                        </Tooltip.Root>
                                    {/if}

                                    {#if isUpdating}
                                        <div
                                            class="flex w-full items-center justify-center gap-1.5 text-[10px] font-medium text-muted-foreground"
                                        >
                                            <span
                                                class="size-3 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground"
                                            ></span>
                                            Updating…
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</Tooltip.Provider>
