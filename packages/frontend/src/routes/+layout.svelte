<script lang="ts">
    import {
        createQuery,
        QueryClient,
        QueryClientProvider,
    } from '@tanstack/svelte-query'

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
                retry: 3,
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

{#if heartbeatQuery.isFetching}
    LOADING
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
