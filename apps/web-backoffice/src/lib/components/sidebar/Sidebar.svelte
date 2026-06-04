<!-- https://shadcn-svelte.com/blocks/sidebar#sidebar-07 -->

<script lang="ts">
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import { type Component, type ComponentProps } from 'svelte'

    import type { SessionState } from '$lib/states/session'
    import SidebarBrand from './SidebarBrand.svelte'
    import NavMain from './SidebarNavMain.svelte'
    import NavUser from './SidebarNavUser.svelte'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        ref = $bindable(null),
        collapsible = 'icon',
        session,
        navItems,
        ...restProps
    }: ComponentProps<typeof Sidebar.Root> & {
        session: SessionState
        navItems: {
            title: string
            url: string
            icon: Component
        }[]
    } = $props()
</script>

<Sidebar.Root
    bind:ref
    {collapsible}
    {...restProps}
>
    <Sidebar.Header>
        <SidebarBrand />
    </Sidebar.Header>
    <Sidebar.Content>
        <NavMain items={navItems} />
    </Sidebar.Content>
    <Sidebar.Footer>
        <NavUser user={session.data} />
    </Sidebar.Footer>
    <Sidebar.Rail />
</Sidebar.Root>
