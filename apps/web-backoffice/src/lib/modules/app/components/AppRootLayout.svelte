<script lang="ts">
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

    /////////////////
    // 05. Queries //
    /////////////////

    // Checks liveness and sets the environment-scoped CSRF cookie in one request.
    const heartbeatQuery = createQuery(
        () => ({
            queryKey: [
                'heartbeat',
            ],
            queryFn: async () => {
                const response = await heartbeatClient.index.$get()
                if (!response.ok) throw new Error('API unavailable.')
                return response
            },
        }),
        () => queryClient,
    )
</script>

<ModeWatcher defaultMode="dark" />

<div class="size-full bg-muted">
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
                {@render children()}
            </SessionProvider>
        </QueryClientProvider>
    {:else}
        UNAVAILABLE
    {/if}
</div>
