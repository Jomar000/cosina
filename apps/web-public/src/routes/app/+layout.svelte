<script lang="ts">
    import { onMount, setContext } from 'svelte'

    import { goto } from '$app/navigation'
    import { authClient } from '$lib/clients'
    import { useAuthContext } from '$lib/states/auth'
    import { useSessionContext } from '$lib/states/session'
    import { getCookie } from '$lib/utilities'

    ////////////////
    // Properties //
    ////////////////

    let { children } = $props()

    //////////////
    // Contexts //
    //////////////

    const session = useSessionContext()
    const auth = useAuthContext()

    ////////////////////
    // Initialization //
    ////////////////////

    let render = $state(false)

    //////////////
    // Handlers //
    //////////////

    /**
     * @deprecated
     */
    const checkRolePermission: TCheckRolePermission = (permissions) => {
        if (!session.isValid()) {
            return false
        }

        return auth.client.organization.checkRolePermission({
            permissions,
            role: session.data.userRoles.join(','),
        })
    }

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

    setContext('checkRolePermission', checkRolePermission)
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
