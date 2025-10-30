<script lang="ts">
    import { onMount } from 'svelte'

    import { goto } from '$app/navigation'
    import AppSidebar from '$lib/components/default/app-sidebar.svelte'
    import * as Sidebar from '$lib/components/shadcn/sidebar/index.js'
    import { useSessionContext } from '$lib/states/session/index.js'

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

    //////////////
    // Handlers //
    //////////////

    //

    ///////////////
    // Lifecycle //
    ///////////////

    onMount(() => {
        if (session.data!.userRoles.includes('member')) {
            render = true
        } else {
            goto(`/app/member/dashboard`, {
                replaceState: true,
            })
        }
    })
</script>

{#if render}
    <Sidebar.Provider>
        <AppSidebar />
        <Sidebar.Inset>
            {@render children()}
        </Sidebar.Inset>
    </Sidebar.Provider>
{/if}
