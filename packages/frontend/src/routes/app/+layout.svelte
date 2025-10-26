<script lang="ts">
    import { onMount, setContext } from 'svelte'

    import { goto } from '$app/navigation'
    import { useAuthContext } from '$lib/states/auth.svelte.js'
    import { useSessionContext } from '$lib/states/session.svelte.js'
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

    ////////////////////
    // Initialization //
    ////////////////////

    let renderView = $state(false)

    //////////////
    // Handlers //
    //////////////

    const checkRolePermission: TCheckRolePermission = (permissions) => {
        if (!session.state) {
            return false
        }

        return auth.state.organization.checkRolePermission({
            permissions,
            role: session.state.userRoles.join(','),
        })
    }

    const clearSessionDataAndRedirect = () => {
        session.clearSession()
        goto('/sign-in')
    }

    const signOut = async () => {
        await auth.state.signOut(undefined, {
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
        renderView =
            session.state !== null && // Valid session
            Math.floor(new Date().getTime() / 1000) < // Non-expired session
                session.state.expiresAt

        if (!renderView) {
            clearSessionDataAndRedirect()
        }
    })
</script>

{#if renderView}
    <div class="flex overflow-hidden">
        {@render children()}
    </div>
{/if}
