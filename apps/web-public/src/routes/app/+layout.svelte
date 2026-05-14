<script lang="ts">
    import { onMount, setContext } from 'svelte'

    import { goto } from '$app/navigation'
    import { authClient } from '$lib/clients'
    import { useSessionContext } from '$lib/states/session'
    import { getCookie } from '$lib/utilities/helper'

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

    const clearSessionDataAndRedirect = () => {
        session.clear()
        goto('/sign-in')
    }

    const signOut = async () => {
        await authClient['sign-out'].$post(
            {},
            {
                headers: {
                    'x-csrf-token': getCookie('csrf_token') ?? '',
                },
            },
        )
        clearSessionDataAndRedirect()
    }

    ///////////////
    // Lifecycle //
    ///////////////

    setContext('signOut', signOut)

    onMount(() => {
        if (session.isValid()) {
            render = true
        } else {
            clearSessionDataAndRedirect()
        }
    })
</script>

{#if render}
    {@render children()}
{/if}
