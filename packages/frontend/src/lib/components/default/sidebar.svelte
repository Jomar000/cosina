<!-- https://shadcn-svelte.com/blocks/sidebar#sidebar-07 -->

<script lang="ts">
    import AudioWaveformIcon from '@lucide/svelte/icons/audio-waveform'
    import CommandIcon from '@lucide/svelte/icons/command'
    import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end'
    import { type Component, type ComponentProps } from 'svelte'

    import * as Sidebar from '$lib/components/shadcn/sidebar/index.js'
    import type { SessionState } from '$lib/states/session/context.svelte'
    import NavMain from './sidebar-nav-main.svelte'
    // import NavProjects from './sidebar-nav-projects.svelte'
    import NavUser from './sidebar-nav-user.svelte'
    import TeamSwitcher from './sidebar-team-switcher.svelte'

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
            isActive?: boolean
            items?: {
                title: string
                url: string
            }[]
        }[]
    } = $props()

    // This is sample data.
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
        // projects: [
        //     {
        //         name: 'Design Engineering',
        //         url: '#',
        //         icon: FrameIcon,
        //     },
        //     {
        //         name: 'Sales & Marketing',
        //         url: '#',
        //         icon: ChartPieIcon,
        //     },
        //     {
        //         name: 'Travel',
        //         url: '#',
        //         icon: MapIcon,
        //     },
        // ],
    }
</script>

<Sidebar.Root
    {collapsible}
    {...restProps}
>
    <Sidebar.Header>
        <TeamSwitcher teams={data.teams} />
    </Sidebar.Header>
    <Sidebar.Content>
        <NavMain items={navItems} />
        <!-- <NavProjects projects={data.projects} /> -->
    </Sidebar.Content>
    <Sidebar.Footer>
        <NavUser user={session.data} />
    </Sidebar.Footer>
    <Sidebar.Rail />
</Sidebar.Root>
