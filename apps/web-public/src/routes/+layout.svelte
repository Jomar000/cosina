<script lang="ts">
    import {
        createQuery,
        QueryClient,
        QueryClientProvider,
    } from '@tanstack/svelte-query'
    import { ModeWatcher } from 'mode-watcher'

    import { heartbeatClient } from '$lib/clients'
    import LoadingScreen from '$lib/components/default/loading-screen.svelte'
    import Sonner from '$lib/components/shadcn/sonner/sonner.svelte'
    import { AuthProvider } from '$lib/states/auth'
    import { SessionProvider } from '$lib/states/session'
    import '../app.css'

    ////////////////
    // Properties //
    ////////////////

    let { children } = $props()

    ////////////////////
    // Initialization //
    ////////////////////

    // Query
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                staleTime: 1000 * 60 * 5, // 5 minutes
            },
        },
    })

    // Checks liveness and sets the csrf_token cookie in a single request.
    const heartbeatQuery = createQuery(
        () => ({
            queryKey: [
                'heartbeat',
            ],
            queryFn: async () => await heartbeatClient.index.$get({}),
        }),
        () => queryClient,
    )
</script>

<ModeWatcher defaultMode="dark" />

<div class="h-full w-full bg-muted">
    {#if heartbeatQuery.isFetching}
        <LoadingScreen />
    {:else if heartbeatQuery.isSuccess}
        <QueryClientProvider client={queryClient}>
            <SessionProvider>
                <AuthProvider>
                    <Sonner
                        closeButton={true}
                        duration={30000}
                        position="top-center"
                    />
                    {@render children()}
                </AuthProvider>
            </SessionProvider>
        </QueryClientProvider>
    {:else}
        UNAVAILABLE
    {/if}
</div>
