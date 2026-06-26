<script lang="ts">
    import * as Collapsible from '@hyperion/ui/components/collapsible'
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'

    import { page } from '$app/state'
    import type { AppNavItem } from './types'

    ////////////////////
    // 01. Properties //
    ////////////////////

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
</script>

<Sidebar.Group>
    <Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
    <Sidebar.Menu>
        {#each items as item (item.title)}
            {#if (item.children?.length ?? 0) > 0}
                <Collapsible.Root
                    open={item.url ? activeUrl.startsWith(item.url) : false}
                    class="group/collapsible"
                >
                    {#snippet child({ props })}
                        <Sidebar.MenuItem {...props}>
                            <Collapsible.Trigger>
                                {#snippet child({ props })}
                                    <Sidebar.MenuButton
                                        {...props}
                                        tooltipContent={item.title}
                                    >
                                        {#if item.icon}
                                            <item.icon />
                                        {/if}
                                        <span>{item.title}</span>
                                        <ChevronRightIcon
                                            class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                                        />
                                    </Sidebar.MenuButton>
                                {/snippet}
                            </Collapsible.Trigger>
                            <Collapsible.Content>
                                <Sidebar.MenuSub>
                                    {#each item.children ?? [] as subItem (subItem.title)}
                                        <Sidebar.MenuSubItem>
                                            <Sidebar.MenuSubButton>
                                                {#snippet child({ props })}
                                                    <a
                                                        href={subItem.url}
                                                        {...props}
                                                    >
                                                        <span
                                                            >{subItem.title}</span
                                                        >
                                                    </a>
                                                {/snippet}
                                            </Sidebar.MenuSubButton>
                                        </Sidebar.MenuSubItem>
                                    {/each}
                                </Sidebar.MenuSub>
                            </Collapsible.Content>
                        </Sidebar.MenuItem>
                    {/snippet}
                </Collapsible.Root>
            {:else}
                <Sidebar.MenuItem>
                    <Sidebar.MenuButton
                        isActive={item.url
                            ? item.exact
                                ? activeUrl === item.url
                                : activeUrl.startsWith(item.url)
                            : false}
                        tooltipContent={item.title}
                    >
                        {#snippet child({ props })}
                            <a
                                href={item.url}
                                {...props}
                                onclick={onNavigate}
                            >
                                {#if item.icon}
                                    <item.icon />
                                {/if}
                                <span>{item.title}</span>
                            </a>
                        {/snippet}
                    </Sidebar.MenuButton>
                </Sidebar.MenuItem>
            {/if}
        {/each}
    </Sidebar.Menu>
</Sidebar.Group>
