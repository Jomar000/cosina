<script lang="ts">
    import ListIcon from '@lucide/svelte/icons/list'
    import UsersIcon from '@lucide/svelte/icons/users'
    import { onMount } from 'svelte'

    import { goto } from '$app/navigation'
    import AppSidebar from '$lib/components/default/sidebar.svelte'
    import * as Sidebar from '$lib/components/shadcn/sidebar'
    import { useSessionContext } from '$lib/states/session'

    ////////////////
    // Properties //
    ////////////////

    let { children } = $props()

    //////////////
    // Contexts //
    //////////////

    const session = useSessionContext()

    ////////////////////
    // Initialization //
    ////////////////////

    let render = $state(false)

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

    //////////////
    // Handlers //
    //////////////

    //

    ///////////////
    // Lifecycle //
    ///////////////

    onMount(() => {
        if (session.data!.userRoles.includes('owner')) {
            render = true
        } else {
            goto(`/app/owner/dashboard`, {
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
            {@render children()}
        </Sidebar.Inset>
    </Sidebar.Provider>
{/if}
