<script lang="ts">
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import type { Component } from 'svelte'

    import { page } from '$app/state'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        items,
    }: {
        items: {
            title: string
            url: string
            icon: Component
        }[]
    } = $props()

    /////////////////
    // 04. Derived //
    /////////////////

    const activeUrl = $derived(page.url.pathname)
</script>

<Sidebar.Group>
    <Sidebar.Menu class="gap-1">
        {#each items as item (item.title)}
            {@const isItemActive = activeUrl.startsWith(item.url)}
            <Sidebar.MenuItem>
                <Sidebar.MenuButton tooltipContent={item.title}>
                    {#snippet child({ props })}
                        <a
                            href={item.url}
                            {...props}
                            data-active={isItemActive || undefined}
                        >
                            <item.icon />
                            <span>{item.title}</span>
                        </a>
                    {/snippet}
                </Sidebar.MenuButton>
            </Sidebar.MenuItem>
        {/each}
    </Sidebar.Menu>
</Sidebar.Group>
