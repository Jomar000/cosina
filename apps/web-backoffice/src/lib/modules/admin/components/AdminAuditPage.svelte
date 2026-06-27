<script lang="ts">
    import * as Select from '@hyperion/ui/components/select'
    import { Separator } from '@hyperion/ui/components/separator'
    import { Skeleton } from '@hyperion/ui/components/skeleton'
    import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list'

    import { createQuery, useQueryClient } from '@tanstack/svelte-query'

    import { adminClient } from '$lib/clients'
    import { wsClientManager } from '$lib/utilities/wsClientManager'

    ///////////////////
    // 02. Constants //
    ///////////////////

    type TAuditRecord = {
        table: string
        id: string
        oldData?: unknown
    }

    type TAuditEntry = {
        id: number
        publicId: string
        organizationId: string | null
        userId: string | null
        component: string
        action: string
        description: string
        records: TAuditRecord[] | null
        ipAddress: string | null
        userAgent: string | null
        loggedAt: string
    }

    type TFilterPreset = {
        value: string
        label: string
        component: string
        action: string
    }

    const FILTER_PRESETS: TFilterPreset[] = [
        { value: 'all', label: 'All Activities', component: '', action: '' },
        {
            value: 'product_update',
            label: 'Updating Product',
            component: 'admin.product',
            action: 'update',
        },
        {
            value: 'order_approve',
            label: 'Approving Order',
            component: 'admin.order',
            action: 'updateStatus',
        },
        {
            value: 'payment_accept',
            label: 'Accepting Payment',
            component: 'admin.order',
            action: 'proof.updateStatus',
        },
        {
            value: 'order_create',
            label: 'Creating Order',
            component: 'admin.order',
            action: 'create',
        },
        {
            value: 'product_create',
            label: 'Creating Product',
            component: 'admin.product',
            action: 'create',
        },
        {
            value: 'settings',
            label: 'Settings Changes',
            component: 'admin.settings',
            action: '',
        },
        {
            value: 'proof_upload',
            label: 'Proof Uploads',
            component: 'admin.order',
            action: 'proof.upload',
        },
    ]

    type TActionMeta = {
        label: string
        accent: string
        border: string
        text: string
        pill: string
    }

    const ACTION_META_MAP: Record<string, TActionMeta> = {
        'admin.product:create': {
            label: 'Product Created',
            accent: 'bg-emerald-500',
            border: 'border-emerald-500/25',
            text: 'text-emerald-400',
            pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
        },
        'admin.product:update': {
            label: 'Product Updated',
            accent: 'bg-amber-500',
            border: 'border-amber-500/25',
            text: 'text-amber-400',
            pill: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
        },
        'admin.product:delete': {
            label: 'Product Deleted',
            accent: 'bg-red-500',
            border: 'border-red-500/25',
            text: 'text-red-400',
            pill: 'bg-red-500/10 text-red-400 border-red-500/25',
        },
        'admin.order:create': {
            label: 'Order Created',
            accent: 'bg-emerald-500',
            border: 'border-emerald-500/25',
            text: 'text-emerald-400',
            pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
        },
        'admin.order:updateStatus': {
            label: 'Order Status Updated',
            accent: 'bg-blue-500',
            border: 'border-blue-500/25',
            text: 'text-blue-400',
            pill: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
        },
        'admin.order:proof.updateStatus': {
            label: 'Payment Verified',
            accent: 'bg-blue-500',
            border: 'border-blue-500/25',
            text: 'text-blue-400',
            pill: 'bg-blue-500/10 text-blue-400 border-blue-500/25',
        },
        'admin.order:proof.upload': {
            label: 'Proof Uploaded',
            accent: 'bg-violet-500',
            border: 'border-violet-500/25',
            text: 'text-violet-400',
            pill: 'bg-violet-500/10 text-violet-400 border-violet-500/25',
        },
        'admin.settings:update': {
            label: 'Settings Changed',
            accent: 'bg-amber-500',
            border: 'border-amber-500/25',
            text: 'text-amber-400',
            pill: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
        },
    }

    const DEFAULT_META: TActionMeta = {
        label: '',
        accent: 'bg-zinc-500',
        border: 'border-zinc-700',
        text: 'text-zinc-400',
        pill: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    }

    function actionMeta(component: string, action: string): TActionMeta {
        const key = `${component}:${action}`
        const found = ACTION_META_MAP[key]
        return found ?? { ...DEFAULT_META, label: action }
    }

    ///////////////
    // 03. State //
    ///////////////

    const queryClient = useQueryClient()

    let selectedFilter = $state('all')

    /////////////////
    // 04. Derived //
    /////////////////

    const activePreset = $derived(
        FILTER_PRESETS.find((p) => p.value === selectedFilter) ??
            FILTER_PRESETS[0],
    )

    /////////////////
    // 05. Queries //
    /////////////////

    const auditQuery = createQuery(() => ({
        queryKey: [
            'admin',
            'audit',
            activePreset.value,
        ],
        refetchInterval: 15_000,
        queryFn: async () => {
            const query: Record<string, string> = {
                limit: '50',
                offset: '0',
                sortOrder: 'desc',
            }
            if (activePreset.component) query.component = activePreset.component
            if (activePreset.action) query.action = activePreset.action

            const response = await (
                adminClient as unknown as {
                    audit: {
                        readMany: {
                            $get: (opts: {
                                query: Record<string, string>
                            }) => Promise<Response>
                        }
                    }
                }
            ).audit.readMany.$get({ query })

            const json = (await response.json()) as {
                success: boolean
                data?: TAuditEntry[]
                error?: { message: string }
            }

            if (!json.success)
                throw new Error(
                    json.error?.message ?? 'Failed to load audit trail.',
                )

            return json.data ?? []
        },
    }))

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        const ws = wsClientManager.connect('audit')

        function handleMessage(event: MessageEvent) {
            try {
                const { event: eventType } = JSON.parse(
                    event.data as string,
                ) as { event: string }
                if (eventType === 'audit.new') {
                    queryClient.invalidateQueries({
                        queryKey: [
                            'admin',
                            'audit',
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

    function formatLoggedAt(dateStr: string): string {
        const date = new Date(dateStr)
        const formatted = new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(date)

        const diffMs = Date.now() - date.getTime()
        const diffSec = Math.floor(diffMs / 1000)
        const diffMin = Math.floor(diffSec / 60)
        const diffHr = Math.floor(diffMin / 60)
        const diffDay = Math.floor(diffHr / 24)

        let relative: string
        if (diffSec < 60) relative = 'just now'
        else if (diffMin < 60) relative = `${diffMin}m ago`
        else if (diffHr < 24) relative = `${diffHr}h ago`
        else relative = `${diffDay}d ago`

        return `${formatted} · ${relative}`
    }

    function formatUserAgent(ua: string | null): string {
        if (!ua) return '—'
        // Extract browser name from user-agent string
        if (ua.includes('Edg/')) return 'Edge'
        if (ua.includes('Chrome/')) return 'Chrome'
        if (ua.includes('Firefox/')) return 'Firefox'
        if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari'
        return ua.slice(0, 40) + (ua.length > 40 ? '…' : '')
    }
</script>

<main class="flex flex-1 flex-col gap-6 p-4 pt-2 md:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
            <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20"
            >
                <ClipboardListIcon class="size-5 text-blue-400" />
            </div>
            <div>
                <h1 class="text-xl font-bold tracking-tight">Audit Trail</h1>
                <p class="text-muted-foreground text-sm">
                    {#if auditQuery.data}
                        {auditQuery.data.length} recent entries
                    {:else}
                        Complete log of all admin actions.
                    {/if}
                </p>
            </div>
        </div>
        <!-- Live indicator -->
        <div
            class="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5"
        >
            <span class="relative flex size-2">
                <span
                    class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"
                ></span>
                <span
                    class="relative inline-flex size-2 rounded-full bg-emerald-500"
                ></span>
            </span>
            <span class="text-xs font-medium text-emerald-400">Live</span>
        </div>
    </div>

    <!-- Filter -->
    <div class="flex items-center gap-2">
        <Select.Root
            type="single"
            value={selectedFilter}
            onValueChange={(v) => (selectedFilter = v ?? 'all')}
        >
            <Select.Trigger class="w-64">
                {FILTER_PRESETS.find((p) => p.value === selectedFilter)
                    ?.label ?? 'All Activities'}
            </Select.Trigger>
            <Select.Content>
                {#each FILTER_PRESETS as preset (preset.value)}
                    <Select.Item value={preset.value}>
                        {preset.label}
                    </Select.Item>
                {/each}
            </Select.Content>
        </Select.Root>
        {#if selectedFilter !== 'all'}
            <span
                class="text-muted-foreground rounded-full border px-2.5 py-1 font-mono text-xs"
            >
                {activePreset.component}{activePreset.action
                    ? ` · ${activePreset.action}`
                    : ''}
            </span>
        {/if}
    </div>

    <Separator />

    <!-- Feed -->
    {#if auditQuery.isPending}
        <div class="flex flex-col gap-4">
            {#each Array.from({ length: 8 }, (_, i) => i) as i (i)}
                <div class="flex gap-3">
                    <div class="mt-1.5 flex flex-col items-center gap-1">
                        <Skeleton class="size-2.5 rounded-full" />
                        <Skeleton
                            class="h-full w-px"
                            style="min-height: 48px;"
                        />
                    </div>
                    <div class="flex flex-1 flex-col gap-2 pb-4">
                        <Skeleton class="h-3.5 w-40" />
                        <Skeleton class="h-4 w-24 rounded-full" />
                        <Skeleton class="h-4 w-3/4" />
                        <Skeleton class="h-3 w-1/2" />
                    </div>
                </div>
            {/each}
        </div>
    {:else if auditQuery.isError}
        <div
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400"
        >
            Failed to load audit trail: {auditQuery.error?.message}
        </div>
    {:else if !auditQuery.data || auditQuery.data.length === 0}
        <div
            class="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center"
        >
            <ClipboardListIcon class="text-muted-foreground size-10" />
            <p class="text-muted-foreground text-sm font-medium">
                No audit entries found
            </p>
            {#if selectedFilter !== 'all'}
                <p class="text-muted-foreground text-xs">
                    Try selecting "All Activities".
                </p>
            {/if}
        </div>
    {:else}
        <div class="flex flex-col gap-2">
            {#each auditQuery.data as entry (entry.id)}
                {@const meta = actionMeta(entry.component, entry.action)}
                <!-- Color-coded card with left accent border -->
                <div
                    class="relative overflow-hidden rounded-lg border {meta.border} bg-zinc-900/50 px-4 py-3"
                >
                    <!-- Left accent stripe -->
                    <div
                        class="absolute inset-y-0 left-0 w-0.75 {meta.accent} rounded-l-full"
                    ></div>

                    <!-- Top row: action label pill + timestamp -->
                    <div class="mb-2 flex items-start justify-between gap-2">
                        <span
                            class="inline-flex items-center rounded-sm border {meta.pill} px-2 py-0.5 text-[11px] font-medium"
                        >
                            {meta.label}
                        </span>
                        <span class="shrink-0 text-[11px] text-zinc-500"
                            >{formatLoggedAt(entry.loggedAt)}</span
                        >
                    </div>

                    <!-- Description — primary text -->
                    <p class="mb-2 text-sm/snug font-medium text-zinc-100">
                        {entry.description}
                    </p>

                    <!-- Technical context: component · action -->
                    <div class="mb-2 flex flex-wrap items-center gap-1">
                        <span
                            class="rounded-sm bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                            >{entry.component}</span
                        >
                        <span class="text-zinc-600 text-xs">·</span>
                        <span
                            class="rounded-sm bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                            >{entry.action}</span
                        >
                    </div>

                    <!-- Affected records -->
                    {#if entry.records && entry.records.length > 0}
                        <div class="mb-2 flex flex-wrap gap-1">
                            {#each entry.records as record (`${record.table}-${record.id}`)}
                                <span
                                    class="inline-flex items-center gap-1 rounded-sm border border-zinc-700 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400"
                                >
                                    <span class="text-zinc-500"
                                        >{record.table}</span
                                    >
                                    <span class="font-mono">#{record.id}</span>
                                </span>
                                {#if record.oldData}
                                    <details class="w-full">
                                        <summary
                                            class="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                        >
                                            View previous values
                                        </summary>
                                        <pre
                                            class="mt-1 overflow-x-auto rounded-sm bg-zinc-800 p-2 text-[11px] text-zinc-300 leading-relaxed">{JSON.stringify(
                                                record.oldData,
                                                null,
                                                2,
                                            )}</pre>
                                    </details>
                                {/if}
                            {/each}
                        </div>
                    {/if}

                    <!-- Meta footer -->
                    <div
                        class="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-500"
                    >
                        <span
                            >By: <span class="font-mono text-zinc-400"
                                >{entry.userId ?? 'System'}</span
                            ></span
                        >
                        {#if entry.ipAddress}
                            <span>IP: {entry.ipAddress}</span>
                        {/if}
                        {#if entry.userAgent}
                            <span
                                title={entry.userAgent}
                                class="cursor-default"
                                >{formatUserAgent(entry.userAgent)}</span
                            >
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</main>
