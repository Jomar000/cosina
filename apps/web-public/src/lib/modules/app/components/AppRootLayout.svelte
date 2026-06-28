<script lang="ts">
    import { Toaster as Sonner } from '@cosina/ui/components/sonner'
    import {
        createQuery,
        QueryClient,
        QueryClientProvider,
    } from '@tanstack/svelte-query'
    import { ModeWatcher } from 'mode-watcher'

    import { heartbeatClient } from '$lib/clients'
    import LoadingScreen from '$lib/components/loader/LoadingScreen.svelte'
    import { IMG_logo } from '$lib/assets/image/index'
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
        <!-- Backend unreachable -->
        <div
            class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-zinc-950"
        >
            <img
                src={IMG_logo}
                alt="Cosina"
                class="size-16 rounded-2xl opacity-60"
            />
            <div class="text-center">
                <p class="font-semibold text-zinc-200">Service Unavailable</p>
                <p class="mt-1 text-sm text-zinc-500">
                    Unable to reach the server. Please check your connection.
                </p>
            </div>
            <button
                onclick={() => location.reload()}
                class="rounded-lg bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
                Retry
            </button>
        </div>
    {/if}
</div>
