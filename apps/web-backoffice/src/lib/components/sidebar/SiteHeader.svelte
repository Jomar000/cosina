<script lang="ts">
    import * as Breadcrumb from '@hyperion/ui/components/breadcrumb'
    import { Separator } from '@hyperion/ui/components/separator'
    import * as Sidebar from '@hyperion/ui/components/sidebar'

    import { page } from '$app/state'

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
    class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
    <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ml-1" />
        <Separator
            orientation="vertical"
            class="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb.Root>
            <Breadcrumb.List>
                {#if breadcrumbs.length === 0}
                    <Breadcrumb.Item class="hidden md:block">
                        <Breadcrumb.Page>Dashboard</Breadcrumb.Page>
                    </Breadcrumb.Item>
                {:else}
                    {#each breadcrumbs as { href, label, isLast } (href)}
                        <Breadcrumb.Item class="hidden md:block">
                            {#if isLast}
                                <Breadcrumb.Page>{label}</Breadcrumb.Page>
                            {:else}
                                <Breadcrumb.Link {href}>{label}</Breadcrumb.Link
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
</header>
