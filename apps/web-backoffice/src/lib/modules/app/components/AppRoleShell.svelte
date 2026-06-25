<script lang="ts">
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import CloudUploadIcon from '@lucide/svelte/icons/cloud-upload'
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

    const baseNavItems: NavItem[] = [
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

    const adminNavItems: NavItem[] = [
        ...baseNavItems,
        {
            title: 'Object Storage',
            url: '#',
            icon: CloudUploadIcon,
            isActive: true,
            items: [
                {
                    title: 'Download',
                    url: '/app/admin/object-storage/download',
                },
                {
                    title: 'Upload',
                    url: '/app/admin/object-storage/upload',
                },
            ],
        },
    ]

    const ownerNavItems: NavItem[] = [
        ...baseNavItems,
        {
            title: 'Object Storage',
            url: '#',
            icon: CloudUploadIcon,
            isActive: true,
            items: [
                {
                    title: 'Download',
                    url: '/app/owner/object-storage/download',
                },
                {
                    title: 'Upload',
                    url: '/app/owner/object-storage/upload',
                },
            ],
        },
    ]

    const navItemsByRole: Record<string, NavItem[]> = {
        admin: adminNavItems,
        member: baseNavItems,
        owner: ownerNavItems,
    }

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()

    /////////////////
    // 04. Derived //
    /////////////////

    const navItems = $derived(navItemsByRole[role] ?? baseNavItems)
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
