<script lang="ts">
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list'
    import HistoryIcon from '@lucide/svelte/icons/history'
    import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
    import PackageIcon from '@lucide/svelte/icons/package'
    import SettingsIcon from '@lucide/svelte/icons/settings'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import { createQuery, useQueryClient } from '@tanstack/svelte-query'
    import { onMount } from 'svelte'

    import { goto } from '$app/navigation'
    import notificationSound from '$lib/assets/audio/notification.mp3'
    import { adminClient } from '$lib/clients'
    import AppSidebar from '$lib/components/sidebar/Sidebar.svelte'
    import SiteHeader from '$lib/components/sidebar/SiteHeader.svelte'
    import { useSessionContext } from '$lib/states/session'
    import { wsClientManager } from '$lib/utilities/wsClientManager'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { children } = $props()

    ///////////////
    // 03. State //
    ///////////////

    const queryClient = useQueryClient()
    const session = useSessionContext()

    let render = $state(false)

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
                query: { limit: '100', offset: '0', sortOrder: 'asc' },
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data
        },
        enabled: render,
    }))

    /////////////////
    // 04. Derived //
    /////////////////

    const pendingCount = $derived.by(
        () =>
            (
                (ordersQuery.data as { status: string }[] | undefined) ?? []
            ).filter((o) => o.status === 'pending').length,
    )

    const navItems = $derived.by(() => [
        {
            title: 'Dashboard',
            url: '/app/admin/dashboard',
            icon: LayoutDashboardIcon,
        },
        {
            title: 'Product',
            url: '/app/admin/product',
            icon: PackageIcon,
        },
        {
            title: 'Orders',
            url: '/app/admin/orders',
            icon: ShoppingCartIcon,
            exact: true,
            badge: pendingCount || undefined,
        },
        {
            title: 'Order History',
            url: '/app/admin/orders/history',
            icon: HistoryIcon,
        },
        {
            title: 'Settings',
            url: '/app/admin/settings',
            icon: SettingsIcon,
            exact: true,
        },
        {
            title: 'Audit Trail',
            url: '/app/admin/audit',
            icon: ClipboardListIcon,
        },
    ])

    /////////////////
    // 08. Effects //
    /////////////////

    onMount(async () => {
        if (!session.data.userRoles.includes('admin')) {
            goto('/sign-in', { replaceState: true })
            return
        }

        render = true

        try {
            const response = await adminClient.order.readMany.$get({
                query: { limit: '100', offset: '0', sortOrder: 'asc' },
            })
            const { data, success } = await response.json()
            if (
                success &&
                (data as { status: string }[]).some(
                    (o) => o.status === 'pending',
                )
            ) {
                new Audio(notificationSound).play().catch(() => {})
            }
        } catch {
            // ignore
        }
    })

    $effect(() => {
        if (!render) return

        const ws = wsClientManager.connect('orders')

        function handleMessage(event: MessageEvent) {
            try {
                const { event: eventType } = JSON.parse(event.data)
                if (eventType === 'order.create') {
                    new Audio(notificationSound).play().catch(() => {})
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
</script>

{#if render}
    <Sidebar.Provider>
        <AppSidebar
            {session}
            {navItems}
        />
        <Sidebar.Inset>
            <SiteHeader />
            {@render children()}
        </Sidebar.Inset>
    </Sidebar.Provider>
{/if}
