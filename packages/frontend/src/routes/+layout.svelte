<script lang="ts">
    import {
        createQuery,
        QueryClient,
        QueryClientProvider,
    } from '@tanstack/svelte-query'
    import { ModeWatcher } from 'mode-watcher'

    import LoadingScreen from '$lib/components/default/loading-screen.svelte'
    import Sonner from '$lib/components/shadcn/sonner/sonner.svelte'
    import { AuthProvider } from '$lib/states/auth/index.js'
    import { SessionProvider } from '$lib/states/session/index.js'
    import { apiClient } from '$lib/utilities.js'
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

    const heartbeatQuery = createQuery(
        () => ({
            queryKey: [
                'heartbeat',
            ],
            queryFn: async () => await apiClient('heartbeat'),
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
