<script lang="ts">
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import ListIcon from '@lucide/svelte/icons/list'
    import UsersIcon from '@lucide/svelte/icons/users'

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

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()
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
