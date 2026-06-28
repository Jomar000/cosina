<script lang="ts">
    import * as DropdownMenu from '@cosina/ui/components/dropdown-menu'
    import BellIcon from '@lucide/svelte/icons/bell'
    import BellRingIcon from '@lucide/svelte/icons/bell-ring'
    import CheckIcon from '@lucide/svelte/icons/check'
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
    import CircleDollarSignIcon from '@lucide/svelte/icons/circle-dollar-sign'
    import MessageCircleHeartIcon from '@lucide/svelte/icons/message-circle-heart'
    import PackageCheckIcon from '@lucide/svelte/icons/package-check'
    import ReceiptIcon from '@lucide/svelte/icons/receipt'

    import { goto } from '$app/navigation'
    import { wsClientManager } from '$lib/utilities/wsClientManager'

    ///////////////////
    // 02. Constants //
    ///////////////////

    type TNotifEvent =
        | 'order.create'
        | 'order.remainingBalanceSubmit'
        | 'order.proofResubmit'
        | 'feedback.create'

    type TNotification = {
        id: number
        type: TNotifEvent
        title: string
        body: string
        customerName: string | null
        trackingCode: string | null
        rating: number | null
        at: Date
        href: string
    }

    const EVENT_META: Record<
        TNotifEvent,
        { title: string; body: string; href: string }
    > = {
        'order.create': {
            title: 'New Order',
            body: 'Placed a new order with downpayment proof.',
            href: '/app/admin/orders',
        },
        'order.remainingBalanceSubmit': {
            title: 'Balance Proof Submitted',
            body: 'Uploaded remaining balance payment proof.',
            href: '/app/admin/orders',
        },
        'order.proofResubmit': {
            title: 'Proof Resubmitted',
            body: 'Re-uploaded a previously rejected proof.',
            href: '/app/admin/orders',
        },
        'feedback.create': {
            title: 'New Feedback',
            body: 'Submitted a customer feedback.',
            href: '/app/admin/feedback',
        },
    }

    let idSeq = 0

    ///////////////
    // 03. State //
    ///////////////

    let notifications = $state<TNotification[]>([])
    let ringing = $state(false)
    let ringTimer: ReturnType<typeof setTimeout> | null = null
    let open = $state(false)

    /////////////////
    // 04. Derived //
    /////////////////

    const count = $derived(notifications.length)
    const hasNew = $derived(count > 0)

    /////////////////
    // 08. Effects //
    /////////////////

    function handleWsMessage(event: MessageEvent) {
        try {
            const parsed = JSON.parse(event.data as string) as {
                event: string
                data?: {
                    trackingCode?: string
                    customerName?: string
                    rating?: number
                }
            }
            const eventType = parsed.event as TNotifEvent
            const meta = EVENT_META[eventType]
            if (!meta) return

            notifications = [
                {
                    id: ++idSeq,
                    type: eventType,
                    title: meta.title,
                    body: meta.body,
                    customerName: parsed.data?.customerName ?? null,
                    trackingCode: parsed.data?.trackingCode ?? null,
                    rating: parsed.data?.rating ?? null,
                    at: new Date(),
                    href: meta.href,
                },
                ...notifications,
            ].slice(0, 20)

            ringing = true
            if (ringTimer) clearTimeout(ringTimer)
            ringTimer = setTimeout(() => (ringing = false), 1200)
        } catch {
            // ignore malformed messages
        }
    }

    $effect(() => {
        const wsOrders = wsClientManager.connect('orders')
        const wsFeedback = wsClientManager.connect('feedback')

        wsOrders.addEventListener('message', handleWsMessage)
        wsFeedback.addEventListener('message', handleWsMessage)

        return () => {
            wsOrders.removeEventListener('message', handleWsMessage)
            wsOrders.release()
            wsFeedback.removeEventListener('message', handleWsMessage)
            wsFeedback.release()
        }
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    function clearAll() {
        notifications = []
    }

    function navigateTo(href: string) {
        open = false
        goto(href)
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function relativeTime(date: Date): string {
        const diffSec = Math.floor((Date.now() - date.getTime()) / 1000)
        if (diffSec < 60) return 'just now'
        const diffMin = Math.floor(diffSec / 60)
        if (diffMin < 60) return `${diffMin}m ago`
        return `${Math.floor(diffMin / 60)}h ago`
    }

    function iconFor(type: TNotifEvent) {
        if (type === 'order.create') return ReceiptIcon
        if (type === 'order.remainingBalanceSubmit') return CircleDollarSignIcon
        if (type === 'feedback.create') return MessageCircleHeartIcon
        return PackageCheckIcon
    }

    function pillColor(type: TNotifEvent): string {
        if (type === 'order.create')
            return 'bg-blue-500/10 text-blue-400 ring-blue-500/20'
        if (type === 'order.remainingBalanceSubmit')
            return 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
        if (type === 'feedback.create')
            return 'bg-pink-500/10 text-pink-400 ring-pink-500/20'
        return 'bg-amber-500/10 text-amber-400 ring-amber-500/20'
    }
</script>

<DropdownMenu.Root bind:open>
    <DropdownMenu.Trigger>
        {#snippet child({ props })}
            <button
                {...props}
                class="relative flex size-8 items-center justify-center rounded-full
                       text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50
                       {ringing ? 'bell-ringing' : ''}
                       {hasNew ? 'text-amber-400 hover:text-amber-300' : ''}"
            >
                {#if hasNew}
                    <BellRingIcon class="size-4.5" />
                    <!-- Badge -->
                    <span
                        class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center
                               rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white
                               {ringing ? 'badge-pulse' : ''}"
                    >
                        {count > 9 ? '9+' : count}
                    </span>
                    <!-- Ping ring when new -->
                    {#if ringing}
                        <span
                            class="absolute inset-0 animate-ping rounded-full bg-amber-400/30"
                        ></span>
                    {/if}
                {:else}
                    <BellIcon class="size-4.5" />
                {/if}
            </button>
        {/snippet}
    </DropdownMenu.Trigger>

    <DropdownMenu.Content
        class="w-80 p-0 overflow-hidden"
        align="end"
        sideOffset={8}
    >
        <!-- Header -->
        <div
            class="flex items-center justify-between border-b border-zinc-800 px-4 py-3"
        >
            <div class="flex items-center gap-2">
                <BellRingIcon class="size-4 text-amber-400" />
                <span class="text-sm font-semibold">Notifications</span>
                {#if hasNew}
                    <span
                        class="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white"
                    >
                        {count}
                    </span>
                {/if}
            </div>
            {#if hasNew}
                <button
                    onclick={clearAll}
                    class="flex items-center gap-1 rounded-sm px-2 py-1 text-xs text-zinc-400
                           hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                >
                    <CheckIcon class="size-3" />
                    Clear all
                </button>
            {/if}
        </div>

        <!-- List -->
        {#if notifications.length === 0}
            <div class="flex flex-col items-center gap-2 py-8 text-center">
                <BellIcon class="size-8 text-zinc-700" />
                <p class="text-sm text-zinc-500">No new notifications</p>
            </div>
        {:else}
            <div class="max-h-96 overflow-y-auto">
                {#each notifications as notif (notif.id)}
                    {@const Icon = iconFor(notif.type)}
                    <button
                        type="button"
                        onclick={() => navigateTo(notif.href)}
                        class="group flex w-full items-start gap-3 border-b border-zinc-800/60 px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-zinc-800/40 active:bg-zinc-800/60"
                    >
                        <!-- Icon pill -->
                        <div
                            class="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 {pillColor(
                                notif.type,
                            )}"
                        >
                            <Icon class="size-4" />
                        </div>

                        <!-- Content -->
                        <div class="min-w-0 flex-1">
                            <!-- Event type label -->
                            <p
                                class="text-[11px] font-semibold uppercase tracking-wide {pillColor(
                                    notif.type,
                                ).split(' ')[1]}"
                            >
                                {notif.title}
                            </p>

                            <!-- Customer name — primary info -->
                            {#if notif.customerName}
                                <p
                                    class="mt-0.5 truncate text-sm/snug font-semibold text-zinc-100"
                                >
                                    {notif.customerName}
                                </p>
                            {/if}

                            <!-- Body description -->
                            <p class="mt-0.5 text-xs/snug text-zinc-400">
                                {notif.body}
                            </p>

                            <!-- Tracking code / rating + time -->
                            <div class="mt-1.5 flex items-center gap-2">
                                {#if notif.trackingCode}
                                    <span
                                        class="rounded-sm bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide text-zinc-400"
                                    >
                                        #{notif.trackingCode}
                                    </span>
                                {/if}
                                {#if notif.rating}
                                    <span class="text-[11px] text-amber-400">
                                        {'★'.repeat(notif.rating)}{'☆'.repeat(
                                            5 - notif.rating,
                                        )}
                                    </span>
                                {/if}
                                <span class="text-[11px] text-zinc-600"
                                    >{relativeTime(notif.at)}</span
                                >
                            </div>
                        </div>

                        <ChevronRightIcon
                            class="mt-1 size-3.5 shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-400"
                        />
                    </button>
                {/each}
            </div>
        {/if}
    </DropdownMenu.Content>
</DropdownMenu.Root>

<style>
    .bell-ringing {
        animation: bell-shake 0.6s ease-in-out;
        transform-origin: top center;
    }

    @keyframes bell-shake {
        0% {
            transform: rotate(0deg);
        }
        10% {
            transform: rotate(22deg);
        }
        25% {
            transform: rotate(-20deg);
        }
        40% {
            transform: rotate(16deg);
        }
        55% {
            transform: rotate(-12deg);
        }
        70% {
            transform: rotate(7deg);
        }
        85% {
            transform: rotate(-4deg);
        }
        100% {
            transform: rotate(0deg);
        }
    }

    .badge-pulse {
        animation: badge-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes badge-pop {
        0% {
            transform: scale(0.5);
        }
        60% {
            transform: scale(1.25);
        }
        100% {
            transform: scale(1);
        }
    }
</style>
