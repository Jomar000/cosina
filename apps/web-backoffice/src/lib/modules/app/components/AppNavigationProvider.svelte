<script lang="ts">
    import { tick } from 'svelte'

    import { afterNavigate, beforeNavigate, goto } from '$app/navigation'
    import { page } from '$app/state'
    import LoadingScreen from '$lib/components/loader/LoadingScreen.svelte'
    import { useSessionContext } from '$lib/states/session'
    import {
        isSessionActive,
        NavigationGeneration,
        resolveCanonicalDestination,
    } from '../utilities/navigation'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { children, heartbeatFailed, heartbeatReady } = $props<{
        children: import('svelte').Snippet
        heartbeatFailed: boolean
        heartbeatReady: boolean
    }>()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const navigationGeneration = new NavigationGeneration()
    const session = useSessionContext()

    ///////////////
    // 03. State //
    ///////////////

    let isLoading = $state(true)
    let settlementScheduled = false

    /////////////////
    // 08. Effects //
    /////////////////

    beforeNavigate(({ willUnload }) => {
        if (!willUnload) beginNavigation()
    })

    afterNavigate(() => {
        scheduleSettlement()
    })

    $effect(() => {
        if (
            !Number.isFinite(session.data.expiresAt) ||
            !Array.isArray(session.data.userRoles)
        ) {
            return
        }

        scheduleSettlement()
    })

    /////////////////
    // 10. Helpers //
    /////////////////

    function beginNavigation() {
        isLoading = true
        return navigationGeneration.begin()
    }

    function scheduleSettlement() {
        if (!heartbeatReady || heartbeatFailed || settlementScheduled) return

        const generation = beginNavigation()
        settlementScheduled = true

        queueMicrotask(() => {
            settlementScheduled = false
            void settleNavigation(generation)
        })
    }

    async function settleNavigation(generation: number) {
        const destination = resolveCanonicalDestination(page.url.pathname, {
            isAuthenticated: isSessionActive(session.data.expiresAt),
            userRoles: session.data.userRoles,
        })

        if (destination && destination !== page.url.pathname) {
            await goto(destination, { replaceState: true })
            return
        }

        await tick()
        await nextAnimationFrame()

        if (navigationGeneration.isCurrent(generation)) {
            isLoading = false
        }
    }

    function nextAnimationFrame() {
        return new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve())
        })
    }
</script>

{#if heartbeatFailed}
    <div
        class="flex min-h-svh items-center justify-center"
        role="alert"
    >
        API unavailable.
    </div>
{:else}
    <div
        aria-hidden={isLoading}
        class="contents"
        inert={isLoading}
    >
        {@render children()}
    </div>

    {#if isLoading}
        <LoadingScreen />
    {/if}
{/if}
