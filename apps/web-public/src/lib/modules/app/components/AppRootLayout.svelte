<script lang="ts">
    import { Toaster as Sonner } from '@hyperion/ui/components/sonner'
    import {
        createQuery,
        QueryClient,
        QueryClientProvider,
    } from '@tanstack/svelte-query'
    import { ModeWatcher } from 'mode-watcher'

    import { heartbeatClient } from '$lib/clients'
    import { SessionProvider } from '$lib/states/session'
    import NavigationGate from './NavigationGate.svelte'

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
            gcTime: Infinity,
            queryFn: async () => {
                const response = await heartbeatClient.index.$get()
                if (!response.ok) throw new Error('API unavailable.')
                return response
            },
            refetchOnMount: false,
            refetchOnReconnect: false,
            refetchOnWindowFocus: false,
            staleTime: Infinity,
        }),
        () => queryClient,
    )
</script>

<ModeWatcher defaultMode="dark" />

<div class="size-full bg-muted">
    <QueryClientProvider client={queryClient}>
        <SessionProvider>
            <NavigationGate
                heartbeatFailed={heartbeatQuery.isError}
                heartbeatReady={heartbeatQuery.isSuccess}
            >
                <Sonner
                    closeButton={true}
                    duration={30000}
                    position="top-center"
                />
                {@render children()}
            </NavigationGate>
        </SessionProvider>
    </QueryClientProvider>
</div>
