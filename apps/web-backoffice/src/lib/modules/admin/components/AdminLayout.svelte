<script lang="ts">
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list'
    import HistoryIcon from '@lucide/svelte/icons/history'
    import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
    import PackageIcon from '@lucide/svelte/icons/package'
    import SettingsIcon from '@lucide/svelte/icons/settings'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import { onMount } from 'svelte'

    import { goto } from '$app/navigation'
    import AppSidebar from '$lib/components/sidebar/Sidebar.svelte'
    import SiteHeader from '$lib/components/sidebar/SiteHeader.svelte'
    import { useSessionContext } from '$lib/states/session'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { children } = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const navItems = [
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
    ]

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()

    let render = $state(false)

    /////////////////
    // 08. Effects //
    /////////////////

    onMount(() => {
        if (session.data.userRoles.includes('admin')) {
            render = true
        } else {
            goto('/sign-in', {
                replaceState: true,
            })
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
