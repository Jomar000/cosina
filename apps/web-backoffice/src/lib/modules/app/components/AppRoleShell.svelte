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

    type Role = 'admin' | 'member' | 'owner'

    type RoleShellConfig = {
        navItems: NavItem[]
    }

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        role,
        children,
    }: {
        role: Role
        children: Snippet
    } = $props()

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

    const roleShellConfig: Record<Role, RoleShellConfig> = {
        admin: {
            navItems: [
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
            ],
        },
        member: {
            navItems: baseNavItems,
        },
        owner: {
            navItems: [
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
            ],
        },
    }

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()

    /////////////////
    // 04. Derived //
    /////////////////

    const roleConfig = $derived(roleShellConfig[role])
</script>

<Sidebar.Provider>
    <AppSidebar
        {session}
        navItems={roleConfig.navItems}
    />
    <Sidebar.Inset>
        <SiteHeader />
        {@render children()}
    </Sidebar.Inset>
</Sidebar.Provider>
