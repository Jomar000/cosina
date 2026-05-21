<script lang="ts">
    import { useQueryClient } from '@tanstack/svelte-query'
    import { onMount, setContext, tick } from 'svelte'

    import { goto } from '$app/navigation'
    import { authClient } from '$lib/clients'
    import { useSessionContext } from '$lib/states/session'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { children } = $props()

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()

    const queryClient = useQueryClient()

    let render = $state(false)

    /////////////////
    // 08. Effects //
    /////////////////

    setContext('signOut', signOut)

    onMount(() => {
        if (session.isValid()) {
            render = true
        } else {
            void clearSessionDataAndRedirect()
        }
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    async function clearSessionDataAndRedirect() {
        await queryClient.cancelQueries()
        queryClient.clear()
        session.clear()
        await goto('/sign-in')
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    async function signOut() {
        // Unmount rendered children before sign-out as cleanup procedure
        render = false
        await tick()

        try {
            await authClient['sign-out'].$post()
        } finally {
            await clearSessionDataAndRedirect()
        }
    }
</script>

{#if render}
    {@render children()}
{/if}
