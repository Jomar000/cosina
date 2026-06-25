<script lang="ts">
    import { useQueryClient } from '@tanstack/svelte-query'
    import { onMount, setContext, type Snippet } from 'svelte'

    import { authClient } from '$lib/clients'
    import { SessionState, setSessionContext } from './context.svelte'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { children } = $props<{
        children: Snippet
    }>()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const session = new SessionState()
    const queryClient = useQueryClient()

    session.loadFromLocalStorage()

    setSessionContext(session)
    setContext('signOut', signOut)

    ///////////////
    // 03. State //
    ///////////////

    let isClearingSession = false
    let sessionExpiryTimeout: ReturnType<typeof setTimeout> | undefined

    /////////////////
    // 08. Effects //
    /////////////////

    onMount(() => clearSessionExpiryTimeout)

    $effect(() => {
        const expiresAt = session.data.expiresAt

        if (!Number.isFinite(expiresAt) || expiresAt <= 0) {
            clearSessionExpiryTimeout()
            return
        }

        scheduleSessionExpiryClear(expiresAt)
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    async function clearSessionData({
        revokeServerSession = false,
    }: { revokeServerSession?: boolean } = {}) {
        if (isClearingSession) return

        isClearingSession = true
        clearSessionExpiryTimeout()
        session.clear()

        try {
            await queryClient.cancelQueries({
                predicate: (query) => query.queryKey[0] !== 'heartbeat',
            })

            if (revokeServerSession) {
                await authClient.signOut.$post()
            }
        } finally {
            queryClient.removeQueries({
                predicate: (query) => query.queryKey[0] !== 'heartbeat',
            })
            queryClient.getMutationCache().clear()
            isClearingSession = false
        }
    }

    async function signOut() {
        await clearSessionData({ revokeServerSession: true })
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

    function scheduleSessionExpiryClear(expiresAt: number) {
        clearSessionExpiryTimeout()

        const delay = Math.max(
            (expiresAt - Math.floor(Date.now() / 1000)) * 1000,
            0,
        )

        if (delay <= 0) {
            void clearSessionData()
            return
        }

        sessionExpiryTimeout = setTimeout(() => {
            void clearSessionData()
        }, delay)
    }
</script>

{@render children()}
