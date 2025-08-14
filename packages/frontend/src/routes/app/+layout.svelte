<script lang="ts">
    import { onMount, setContext } from 'svelte'

    import { goto } from '$app/navigation'
    import { authClientState } from '$lib/states/auth.svelte.js'
    import { sessionDataState } from '$lib/states/session.svelte.js'
    import { getCookie } from '$lib/utilities.js'

    ////////////////
    // Properties //
    ////////////////

    let { children } = $props()

    ////////////////////
    // Initialization //
    ////////////////////

    let renderView = $state(false)

    //////////////
    // Handlers //
    //////////////

    const checkRolePermission: TCheckRolePermission = (permissions) => {
        if (!sessionDataState.value) {
            return false
        }

        return authClientState.value.organization.checkRolePermission({
            permissions,
            role: sessionDataState.value.roleName,
        })
    }

    const clearSessionDataAndRedirect = () => {
        sessionDataState.clear()
        goto('/sign-in')
    }

    const signOut = async () => {
        await authClientState.value.signOut(undefined, {
            headers: {
                'x-csrf-token': getCookie('csrf_token') ?? '',
            },
        })
        clearSessionDataAndRedirect()
    }

    ///////////////
    // Lifecycle //
    ///////////////

    setContext('authClient', authClientState.value)
    setContext('checkRolePermission', checkRolePermission)
    setContext('sessionData', sessionDataState.value)
    setContext('signOut', signOut)

    onMount(() => {
        renderView =
            sessionDataState.value !== null && // Valid session
            Math.floor(new Date().getTime() / 1000) < // Non-expired session
                sessionDataState.value.expiresAt

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
