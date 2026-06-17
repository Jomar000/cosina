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

    let isClearingSession = false

    let sessionExpiryTimeout: ReturnType<typeof setTimeout> | undefined

    /////////////////
    // 08. Effects //
    /////////////////

    setContext('signOut', signOut)

    onMount(() => {
        initializeSession()

        return clearSessionExpiryTimeout
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    async function clearSessionDataAndRedirect({
        revokeServerSession = false,
    }: { revokeServerSession?: boolean } = {}) {
        if (isClearingSession) return

        isClearingSession = true
        clearSessionExpiryTimeout()
        render = false
        await tick()

        await queryClient.cancelQueries()

        try {
            if (revokeServerSession) {
                await authClient.signOut.$post()
            }
        } finally {
            queryClient.clear()
            session.clear()
            await goto('/sign-in')
        }
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function clearSessionExpiryTimeout() {
        if (sessionExpiryTimeout) {
            clearTimeout(sessionExpiryTimeout)
            sessionExpiryTimeout = undefined
        }
    }

    function initializeSession() {
        if (session.isValid()) {
            render = true
            scheduleSessionExpiryClear()
        } else {
            void clearSessionDataAndRedirect()
        }
    }

    function scheduleSessionExpiryClear() {
        clearSessionExpiryTimeout()

        const delay = session.getMillisecondsUntilExpiry()

        if (delay <= 0) {
            void clearSessionDataAndRedirect()
            return
        }

        sessionExpiryTimeout = setTimeout(() => {
            void clearSessionDataAndRedirect()
        }, delay)
    }

    async function signOut() {
        await clearSessionDataAndRedirect({ revokeServerSession: true })
    }
</script>

{#if render}
    {@render children()}
{/if}
