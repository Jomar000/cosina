<script lang="ts">
    import * as Sidebar from '@cosina/ui/components/sidebar'

    import { page } from '$app/state'

    ////////////////////
    // 01. Properties //
    ////////////////////

    import type { AppNavItem } from './types'

    let {
        items,
        onNavigate,
    }: {
        items: AppNavItem[]
        onNavigate?: () => void
    } = $props()

    /////////////////
    // 04. Derived //
    /////////////////

    const activeUrl = $derived(page.url.pathname)
    const sidebar = Sidebar.useSidebar()

    //////////////////
    // 09. Handlers //
    //////////////////

    function handleNavClick() {
        onNavigate?.()
        sidebar.setOpenMobile(false)
    }
</script>

<Sidebar.Group>
    <Sidebar.Menu class="gap-0.5">
        {#each items as item (item.title)}
            {@const isItemActive = item.url
                ? item.exact
                    ? activeUrl === item.url
                    : activeUrl.startsWith(item.url)
                : false}
            <Sidebar.MenuItem>
                <Sidebar.MenuButton tooltipContent={item.title}>
                    {#snippet child({ props })}
                        <a
                            href={item.url}
                            {...props}
                            data-active={isItemActive || undefined}
                            class="{props.class ?? ''} {isItemActive
                                ? 'text-blue-400'
                                : ''}"
                            onclick={handleNavClick}
                        >
                            <div class="relative">
                                <item.icon />
                                {#if item.badge}
                                    <span
                                        class="absolute -right-1 -top-1 hidden size-2 rounded-full bg-destructive group-data-[collapsible=icon]:block"
                                    ></span>
                                {/if}
                            </div>
                            <span>{item.title}</span>

                            <!-- Active left indicator accent (expanded mode) -->
                            {#if isItemActive}
                                <span
                                    class="ml-auto size-1.5 shrink-0 rounded-full bg-blue-400 group-data-[collapsible=icon]:hidden"
                                ></span>
                            {/if}
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
