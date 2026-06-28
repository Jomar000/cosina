<script lang="ts">
    import * as Breadcrumb from '@cosina/ui/components/breadcrumb'
    import { Separator } from '@cosina/ui/components/separator'
    import * as Sidebar from '@cosina/ui/components/sidebar'

    import { page } from '$app/state'
    import NotificationBell from './NotificationBell.svelte'

    /////////////////
    // 04. Derived //
    /////////////////

    const breadcrumbs = $derived.by(() =>
        generateBreadcrumbs(page.url.pathname),
    )

    /////////////////
    // 10. Helpers //
    /////////////////

    function generateBreadcrumbs(pathname: string) {
        const segments = pathname.split('/').filter(Boolean)

        return segments.map((segment, index) => {
            const href = `/${segments.slice(0, index + 1).join('/')}`
            const label = `${segment.charAt(0).toUpperCase()}${segment.slice(1).replace(/-/g, ' ')}`

            return { href, label, isLast: index === segments.length - 1 }
        })
    }
</script>

<header
    class="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2
           border-b border-zinc-800/50 bg-background/90 backdrop-blur-sm
           transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
    <!-- Left: sidebar toggle (mobile only) + breadcrumbs -->
    <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ml-1 md:hidden" />
        <Separator
            orientation="vertical"
            class="mr-2 md:hidden data-[orientation=vertical]:h-4"
        />
        <Breadcrumb.Root>
            <Breadcrumb.List>
                {#if breadcrumbs.length === 0}
                    <Breadcrumb.Item>
                        <Breadcrumb.Page>Dashboard</Breadcrumb.Page>
                    </Breadcrumb.Item>
                {:else}
                    {#each breadcrumbs as { href, label, isLast } (href)}
                        <Breadcrumb.Item class="hidden md:block">
                            {#if isLast}
                                <Breadcrumb.Page
                                    class="font-medium text-zinc-200"
                                    >{label}</Breadcrumb.Page
                                >
                            {:else}
                                <Breadcrumb.Link
                                    {href}
                                    class="text-zinc-500 hover:text-zinc-300"
                                    >{label}</Breadcrumb.Link
                                >
                            {/if}
                        </Breadcrumb.Item>
                        {#if !isLast}
                            <Breadcrumb.Separator class="hidden md:block" />
                        {/if}
                    {/each}
                {/if}
            </Breadcrumb.List>
        </Breadcrumb.Root>
    </div>

    <!-- Right: notification bell -->
    <div class="flex items-center px-4">
        <NotificationBell />
    </div>
</header>
