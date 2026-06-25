<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import * as Popover from '@hyperion/ui/components/popover'
    import * as Tooltip from '@hyperion/ui/components/tooltip'
    import { cn } from '@hyperion/ui/utils'
    import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
    import PanelLeftCloseIcon from '@lucide/svelte/icons/panel-left-close'
    import PanelLeftOpenIcon from '@lucide/svelte/icons/panel-left-open'
    import { SvelteSet } from 'svelte/reactivity'

    import { page } from '$app/state'
    import ThemeToggle from './ThemeToggle.svelte'
    import type { AppNavItem } from './types'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        class: className,
        collapsed = $bindable(false),
        mobile = false,
        navItems,
        onNavigate,
    }: {
        class?: string
        collapsed?: boolean
        mobile?: boolean
        navItems: AppNavItem[]
        onNavigate?: () => void
    } = $props()

    ///////////////
    // 03. State //
    ///////////////

    const expandedItems = new SvelteSet([
        'Workspace',
    ])

    /////////////////
    // 04. Derived //
    /////////////////

    const isCollapsed = $derived(collapsed && !mobile)

    //////////////////
    // 09. Handlers //
    //////////////////

    function toggleExpanded(label: string) {
        if (expandedItems.has(label)) expandedItems.delete(label)
        else expandedItems.add(label)
    }

    function handleNavigate() {
        onNavigate?.()
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function isActive(item: AppNavItem) {
        if (item.href === page.url.pathname) return true
        return item.children?.some((child) => child.href === page.url.pathname)
    }
</script>

<aside
    class={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-in-out',
        isCollapsed ? 'w-14' : 'w-60',
        className,
    )}
>
    <div class="flex h-15 shrink-0 items-center border-b border-sidebar-border">
        {#if isCollapsed}
            <div class="flex w-full justify-center">
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        {#snippet child({ props })}
                            <Button
                                {...props}
                                aria-label="Expand sidebar"
                                class="size-9 rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground active:translate-y-0"
                                onclick={() => (collapsed = false)}
                                size="icon-lg"
                                variant="ghost"
                            >
                                <PanelLeftOpenIcon class="size-4" />
                            </Button>
                        {/snippet}
                    </Tooltip.Trigger>
                    <Tooltip.Content side="right">
                        Expand sidebar
                    </Tooltip.Content>
                </Tooltip.Root>
            </div>
        {:else}
            <div class="flex w-full items-center gap-3 pr-2 pl-4">
                <div
                    class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
                >
                    H
                </div>
                <div class="flex min-w-0 flex-1 flex-col">
                    <span
                        class="text-sm/tight font-semibold tracking-tight text-sidebar-foreground"
                    >
                        Hyperion
                    </span>
                    <span
                        class="truncate text-[10px] leading-tight text-sidebar-foreground/50"
                    >
                        Application Platform
                    </span>
                </div>
                {#if !mobile}
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            {#snippet child({ props })}
                                <Button
                                    {...props}
                                    aria-label="Collapse sidebar"
                                    class="size-7 shrink-0 rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground active:translate-y-0"
                                    onclick={() => (collapsed = true)}
                                    size="icon-sm"
                                    variant="ghost"
                                >
                                    <PanelLeftCloseIcon class="size-4" />
                                </Button>
                            {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content side="right">
                            Collapse sidebar
                        </Tooltip.Content>
                    </Tooltip.Root>
                {/if}
            </div>
        {/if}
    </div>

    {#if navItems.length === 0}
        <div
            class={cn(
                'flex flex-1 items-center justify-center p-4 text-center text-xs text-sidebar-foreground/45',
                isCollapsed && 'px-2 [writing-mode:vertical-rl]',
            )}
        >
            Member navigation coming soon
        </div>
    {:else if isCollapsed}
        <nav
            class="flex flex-1 flex-col items-center gap-1 overflow-y-auto py-3"
        >
            {#each navItems as item (item.label)}
                {@const Icon = item.icon}
                {#if item.children?.length}
                    <Popover.Root>
                        <Tooltip.Root>
                            <Tooltip.Trigger>
                                {#snippet child({ props: tooltipProps })}
                                    <Popover.Trigger>
                                        {#snippet child({
                                            props: popoverProps,
                                        })}
                                            <Button
                                                {...tooltipProps}
                                                {...popoverProps}
                                                aria-label={item.label}
                                                class={cn(
                                                    'size-9 rounded-md transition-colors aria-expanded:bg-transparent aria-expanded:text-inherit active:translate-y-0',
                                                    isActive(item)
                                                        ? 'bg-sidebar-accent text-sidebar-foreground aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-foreground'
                                                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                                                )}
                                                size="icon-lg"
                                                variant="ghost"
                                            >
                                                <Icon class="size-4" />
                                            </Button>
                                        {/snippet}
                                    </Popover.Trigger>
                                {/snippet}
                            </Tooltip.Trigger>
                            <Tooltip.Content side="right">
                                {item.label}
                            </Tooltip.Content>
                        </Tooltip.Root>
                        <Popover.Content
                            align="start"
                            class="w-52 p-1.5"
                            side="right"
                            sideOffset={10}
                        >
                            <p
                                class="px-2 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                            >
                                {item.label}
                            </p>
                            {#each item.children as child (child.label)}
                                {@const ChildIcon = child.icon}
                                {#if child.disabled}
                                    <span
                                        aria-disabled="true"
                                        class="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground/45"
                                    >
                                        <ChildIcon class="size-3.5" />
                                        {child.label}
                                    </span>
                                {:else}
                                    <a
                                        class={cn(
                                            'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors hover:bg-accent',
                                            child.href === page.url.pathname &&
                                                'bg-accent font-medium text-foreground',
                                        )}
                                        href={child.href}
                                        onclick={handleNavigate}
                                    >
                                        <ChildIcon class="size-3.5" />
                                        {child.label}
                                    </a>
                                {/if}
                            {/each}
                        </Popover.Content>
                    </Popover.Root>
                {:else if item.disabled}
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            {#snippet child({ props })}
                                <span
                                    {...props}
                                    aria-disabled="true"
                                    class="flex size-9 cursor-not-allowed items-center justify-center rounded-md text-sidebar-foreground/30"
                                >
                                    <Icon class="size-4" />
                                </span>
                            {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content side="right">
                            {item.label} - coming soon
                        </Tooltip.Content>
                    </Tooltip.Root>
                {:else}
                    <Tooltip.Root>
                        <Tooltip.Trigger>
                            {#snippet child({ props })}
                                <a
                                    {...props}
                                    aria-label={item.label}
                                    class={cn(
                                        'flex size-9 items-center justify-center rounded-md transition-colors',
                                        isActive(item)
                                            ? 'bg-sidebar-accent text-sidebar-foreground'
                                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                                    )}
                                    href={item.href}
                                >
                                    <Icon class="size-4" />
                                </a>
                            {/snippet}
                        </Tooltip.Trigger>
                        <Tooltip.Content side="right">
                            {item.label}
                        </Tooltip.Content>
                    </Tooltip.Root>
                {/if}
            {/each}
        </nav>
    {:else}
        <nav class="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3">
            {#each navItems as item (item.label)}
                {@const Icon = item.icon}
                {#if item.children?.length}
                    <Button
                        aria-expanded={expandedItems.has(item.label)}
                        class={cn(
                            'w-full justify-start gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors aria-expanded:bg-transparent aria-expanded:text-inherit active:translate-y-0',
                            isActive(item)
                                ? 'bg-sidebar-accent text-sidebar-foreground aria-expanded:bg-sidebar-accent aria-expanded:text-sidebar-foreground'
                                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                        )}
                        onclick={() => toggleExpanded(item.label)}
                        variant="ghost"
                    >
                        <Icon class="size-4 shrink-0 opacity-70" />
                        <span class="flex-1 text-left">{item.label}</span>
                        {#if expandedItems.has(item.label)}
                            <ChevronDownIcon class="size-3.5 opacity-50" />
                        {:else}
                            <ChevronRightIcon class="size-3.5 opacity-50" />
                        {/if}
                    </Button>
                    {#if expandedItems.has(item.label)}
                        <div class="mt-0.5 flex flex-col gap-0.5">
                            {#each item.children as child (child.label)}
                                {@const ChildIcon = child.icon}
                                {#if child.disabled}
                                    <span
                                        aria-disabled="true"
                                        class="flex cursor-not-allowed items-center gap-2.5 rounded-md py-1.5 pr-2.5 pl-8 text-[13px] text-sidebar-foreground/30"
                                        title="Coming soon"
                                    >
                                        <ChildIcon
                                            class="size-4 shrink-0 opacity-70"
                                        />
                                        {child.label}
                                    </span>
                                {:else}
                                    <a
                                        class={cn(
                                            'flex items-center gap-2.5 rounded-md py-1.5 pr-2.5 pl-8 text-[13px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                                            child.href === page.url.pathname &&
                                                'bg-sidebar-accent text-sidebar-foreground',
                                        )}
                                        href={child.href}
                                        onclick={handleNavigate}
                                    >
                                        <ChildIcon
                                            class="size-4 shrink-0 opacity-70"
                                        />
                                        {child.label}
                                    </a>
                                {/if}
                            {/each}
                        </div>
                    {/if}
                {:else if item.disabled}
                    <span
                        aria-disabled="true"
                        class="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-sidebar-foreground/30"
                        title="Coming soon"
                    >
                        <Icon class="size-4 opacity-70" />
                        {item.label}
                    </span>
                {:else}
                    <a
                        class={cn(
                            'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                            isActive(item) &&
                                'bg-sidebar-accent text-sidebar-foreground',
                        )}
                        href={item.href}
                        onclick={handleNavigate}
                    >
                        <Icon class="size-4 opacity-70" />
                        {item.label}
                    </a>
                {/if}
            {/each}
        </nav>
    {/if}

    <div
        class={cn(
            'flex items-center border-t border-sidebar-border pt-2 pb-3',
            isCollapsed ? 'justify-center' : 'justify-between px-2',
        )}
    >
        {#if !isCollapsed}
            <span class="pl-1 text-[11px] text-sidebar-foreground/40">
                Template
            </span>
        {/if}
        <ThemeToggle />
    </div>
</aside>
