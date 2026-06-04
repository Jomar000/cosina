<script lang="ts">
    import { navigating } from '$app/state'
    import { Toaster as Sonner } from '@hyperion/ui/components/sonner'
    import {
        createQuery,
        QueryClient,
        QueryClientProvider,
    } from '@tanstack/svelte-query'
    import { ModeWatcher } from 'mode-watcher'

    import { heartbeatClient } from '$lib/clients'
    import LoadingScreen from '$lib/components/loader/LoadingScreen.svelte'
    import { SessionProvider } from '$lib/states/session'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { children } = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: 1000 * 60 * 5, // 5 minutes
            },
        },
    })

    ///////////////
    // 03. State //
    ///////////////

    let showNavLoader = $state(false)
    let navStartTime = 0
    let navTimer: ReturnType<typeof setTimeout> | null = null

    /////////////////
    // 05. Queries //
    /////////////////

    // Checks liveness and sets the csrf_token cookie in a single request.
    const heartbeatQuery = createQuery(
        () => ({
            queryKey: [
                'heartbeat',
            ],
            queryFn: async () => {
                await heartbeatClient.index.$get()
                return null
            },
        }),
        () => queryClient,
    )

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        if (navigating.to) {
            showNavLoader = true
            navStartTime = Date.now()
            if (navTimer) clearTimeout(navTimer)
            navTimer = null
        } else if (showNavLoader) {
            const remaining = Math.max(0, 2000 - (Date.now() - navStartTime))
            navTimer = setTimeout(() => {
                showNavLoader = false
            }, remaining)
        }

        return () => {
            if (navTimer) clearTimeout(navTimer)
        }
    })
</script>

<ModeWatcher defaultMode="dark" />

<div class="h-full w-full bg-muted">
    {#if heartbeatQuery.isFetching}
        <LoadingScreen />
    {:else if heartbeatQuery.isSuccess}
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
                <Sonner
                    closeButton={true}
                    duration={30000}
                    position="top-center"
                />
                {#if showNavLoader}
                    <LoadingScreen />
                {:else}
                    {@render children()}
                {/if}
            </SessionProvider>
        </QueryClientProvider>
    {:else}
        UNAVAILABLE
    {/if}
</div>
