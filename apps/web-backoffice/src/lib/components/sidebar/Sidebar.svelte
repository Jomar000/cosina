<!-- https://shadcn-svelte.com/blocks/sidebar#sidebar-07 -->

<script lang="ts">
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import { type ComponentProps } from 'svelte'

    import type { SessionState } from '$lib/states/session'
    import SidebarBrand from './SidebarBrand.svelte'
    import NavMain from './SidebarNavMain.svelte'
    import NavUser from './SidebarNavUser.svelte'
    import type { AppNavItem } from './types'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        ref = $bindable(null),
        collapsible = 'offcanvas',
        session,
        navItems,
        mobile = false,
        onNavigate,
        ...restProps
    }: ComponentProps<typeof Sidebar.Root> & {
        session: SessionState
        navItems: AppNavItem[]
        mobile?: boolean
        onNavigate?: () => void
    } = $props()

    const resolvedCollapsible = $derived(mobile ? 'none' : collapsible)
</script>

<Sidebar.Root
    bind:ref
    collapsible={resolvedCollapsible}
    {...restProps}
    class="[--sidebar-accent:rgb(59_130_246/0.12)] [--sidebar-accent-foreground:rgb(96_165_250)] border-r border-zinc-800/60"
>
    <Sidebar.Header>
        <SidebarBrand />
    </Sidebar.Header>
    <Sidebar.Content>
        <NavMain
            items={navItems}
            {onNavigate}
        />
    </Sidebar.Content>
    <Sidebar.Footer>
        <NavUser user={session.data} />
    </Sidebar.Footer>
</Sidebar.Root>
