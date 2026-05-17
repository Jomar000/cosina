<script lang="ts">
    import { onMount, setContext } from 'svelte'

    import { goto } from '$app/navigation'
    import { authClient } from '$lib/clients'
    import { useSessionContext } from '$lib/states/session'
    import { getCookie } from '$lib/utilities/helpers'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { children } = $props()

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()

    let render = $state(false)

    /////////////////
    // 08. Effects //
    /////////////////

    setContext('signOut', signOut)

    onMount(() => {
        if (session.isValid()) {
            render = true
        } else {
            clearSessionDataAndRedirect()
        }
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    function clearSessionDataAndRedirect() {
        session.clear()
        goto('/sign-in')
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    async function signOut() {
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
</script>

{#if render}
    {@render children()}
{/if}
