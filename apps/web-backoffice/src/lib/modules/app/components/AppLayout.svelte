<script lang="ts">
    import { useQueryClient } from '@tanstack/svelte-query'
    import { onMount, setContext, untrack } from 'svelte'

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

    async function clearSessionData({
        revokeServerSession = false,
    }: { revokeServerSession?: boolean } = {}) {
        if (isClearingSession) return

        isClearingSession = true
        clearSessionExpiryTimeout()
        session.clear()

        await queryClient.cancelQueries({
            predicate: (query) => query.queryKey[0] !== 'heartbeat',
        })

        try {
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
        if (untrack(() => session.isValid())) {
            scheduleSessionExpiryClear()
        }
    }

    function scheduleSessionExpiryClear() {
        clearSessionExpiryTimeout()

        const delay = session.getMillisecondsUntilExpiry()

        if (delay <= 0) {
            void clearSessionData()
            return
        }

        sessionExpiryTimeout = setTimeout(() => {
            void clearSessionData()
        }, delay)
    }

    async function signOut() {
        await clearSessionData({ revokeServerSession: true })
    }
</script>

{@render children()}
