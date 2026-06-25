<script lang="ts">
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import ListIcon from '@lucide/svelte/icons/list'
    import UsersIcon from '@lucide/svelte/icons/users'
    import { type Component, type Snippet } from 'svelte'

    import AppSidebar from '$lib/components/sidebar/Sidebar.svelte'
    import SiteHeader from '$lib/components/sidebar/SiteHeader.svelte'
    import { useSessionContext } from '$lib/states/session'

    type NavItem = {
        title: string
        url: string
        icon: Component
        isActive?: boolean
        items?: {
            title: string
            url: string
        }[]
    }

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { role, children } = $props<{
        role: string
        children: Snippet
    }>()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const commonNavItems: NavItem[] = [
        {
            title: 'Transactions',
            url: '#',
            icon: ListIcon,
            isActive: true,
            items: [
                {
                    title: 'History',
                    url: '#',
                },
            ],
        },
        {
            title: 'Visitors',
            url: '#',
            icon: UsersIcon,
            isActive: true,
            items: [
                {
                    title: 'History',
                    url: '#',
                },
            ],
        },
    ]

    const navItemsByRole: Record<string, NavItem[]> = {
        admin: commonNavItems,
        member: commonNavItems,
        owner: commonNavItems,
    }

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()

    /////////////////
    // 04. Derived //
    /////////////////

    const navItems = $derived(navItemsByRole[role] ?? commonNavItems)
</script>

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
