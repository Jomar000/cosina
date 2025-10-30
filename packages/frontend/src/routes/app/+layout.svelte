<script lang="ts">
    import { onMount, setContext } from 'svelte'

    import { goto } from '$app/navigation'
    import { useAuthContext } from '$lib/states/auth/index.js'
    import { useSessionContext } from '$lib/states/session/index.js'
    import { getCookie } from '$lib/utilities.js'

    ////////////////
    // Properties //
    ////////////////

    let { children } = $props()

    //////////////
    // Contexts //
    //////////////

    const session = useSessionContext()
    const auth = useAuthContext()

    //////////////
    // Handlers //
    //////////////

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
        await auth.client.signOut(undefined, {
            headers: {
                'x-csrf-token': getCookie('csrf_token') ?? '',
            },
        })
        clearSessionDataAndRedirect()
    }

    ///////////////
    // Lifecycle //
    ///////////////

    setContext('checkRolePermission', checkRolePermission)
    setContext('signOut', signOut)

    onMount(() => {
        if (!session.isValid()) {
            clearSessionDataAndRedirect()
        }
    })
</script>

{#if session.isValid()}
    {@render children()}
{/if}
