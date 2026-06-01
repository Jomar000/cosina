<script lang="ts">
    import * as Collapsible from '@hyperion/ui/components/collapsible'
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
    import type { Component } from 'svelte'

    let {
        items,
    }: {
        items: {
            title: string
            url: string
            icon: Component
            isActive: boolean
            items: {
                title: string
                url: string
            }[]
        }[]
    } = $props()
</script>

<Sidebar.Group>
    <Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
    <Sidebar.Menu>
        {#each items as item (item.title)}
            {#if item.items?.length > 0}
                <Collapsible.Root
                    open={item.isActive}
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
                                    {#each item.items ?? [] as subItem (subItem.title)}
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
                        isActive={item.isActive}
                        tooltipContent={item.title}
                    >
                        {#snippet child({ props })}
                            <a
                                href={item.url}
                                {...props}
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
