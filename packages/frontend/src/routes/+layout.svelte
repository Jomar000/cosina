<script lang="ts">
    import '@phosphor-icons/web/bold'
    import {
        createQuery,
        QueryClient,
        QueryClientProvider,
    } from '@tanstack/svelte-query'

    import ServiceUnavailable from '$lib/components/Error/503.svelte'
    import Loader from '$lib/components/Loader/loader2.svelte'
    import { fetchClient } from '$lib/utilities.js'
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

    const healthCheckQuery = createQuery(
        {
            queryKey: [
                'healthCheck',
            ],
            queryFn: async () => await fetchClient('/healthCheck'),
        },
        queryClient,
    )
</script>

{#if $healthCheckQuery.isFetching}
    <Loader />
{:else if $healthCheckQuery.isSuccess && $healthCheckQuery.data.success}
    <QueryClientProvider client={queryClient}>
        <!--
            Flowbite Blocks - Application UI
            https://flowbite.com/blocks/application/shells/#application-shell-with-sidebar-and-navbar
        -->
        <div class="min-w-[360px] bg-gray-50 antialiased dark:bg-neutral-900">
            {@render children()}
        </div>
    </QueryClientProvider>
{:else}
    <ServiceUnavailable />
{/if}
