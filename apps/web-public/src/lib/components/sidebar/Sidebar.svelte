<!-- https://shadcn-svelte.com/blocks/sidebar#sidebar-07 -->

<script lang="ts">
    import * as Sidebar from '@cosina/ui/components/sidebar'
    import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform'
    import CommandIcon from '@lucide/svelte/icons/command'
    import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end'
    import { type ComponentProps } from 'svelte'

    import type { SessionState } from '$lib/states/session'
    import NavMain from './SidebarNavMain.svelte'
    import NavUser from './SidebarNavUser.svelte'
    import TeamSwitcher from './SidebarTeamSwitcher.svelte'
    import type { AppNavItem } from './types'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        ref = $bindable(null),
        collapsible = 'icon',
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

    ///////////////////
    // 02. Constants //
    ///////////////////

    const data = {
        teams: [
            {
                name: 'Acme Inc',
                logo: GalleryVerticalEndIcon,
                plan: 'Enterprise',
            },
            {
                name: 'Acme Corp.',
                logo: AudioWaveformIcon,
                plan: 'Startup',
            },
            {
                name: 'Evil Corp.',
                logo: CommandIcon,
                plan: 'Free',
            },
        ],
    }
</script>

<Sidebar.Root
    bind:ref
    collapsible={resolvedCollapsible}
    {...restProps}
>
    <Sidebar.Header>
        <TeamSwitcher teams={data.teams} />
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
    <Sidebar.Rail />
</Sidebar.Root>
