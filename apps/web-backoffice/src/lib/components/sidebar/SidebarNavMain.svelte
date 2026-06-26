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
            exact?: boolean
            badge?: number
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
            {@const isItemActive = item.exact
                ? activeUrl === item.url
                : activeUrl.startsWith(item.url)}
            <Sidebar.MenuItem>
                <Sidebar.MenuButton tooltipContent={item.title}>
                    {#snippet child({ props })}
                        <a
                            href={item.url}
                            {...props}
                            data-active={isItemActive || undefined}
                        >
                            <div class="relative">
                                <item.icon />
                                {#if item.badge}
                                    <span
                                        class="absolute -right-1 -top-1 hidden size-2 rounded-full bg-destructive group-data-[collapsible=icon]:block"
                                    />
                                {/if}
                            </div>
                            <span>{item.title}</span>
                        </a>
                    {/snippet}
                </Sidebar.MenuButton>
                {#if item.badge}
                    <Sidebar.MenuBadge
                        class="rounded-full bg-destructive text-destructive-foreground"
                    >
                        {item.badge > 99 ? '99+' : item.badge}
                    </Sidebar.MenuBadge>
                {/if}
            </Sidebar.MenuItem>
        {/each}
    </Sidebar.Menu>
</Sidebar.Group>
