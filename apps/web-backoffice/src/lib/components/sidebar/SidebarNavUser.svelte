<script lang="ts">
    import * as Avatar from '@hyperion/ui/components/avatar'
    import * as DropdownMenu from '@hyperion/ui/components/dropdown-menu'
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import { useSidebar } from '@hyperion/ui/components/sidebar'
    import BadgeCheckIcon from '@lucide/svelte/icons/badge-check'
    import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down'
    import LogOutIcon from '@lucide/svelte/icons/log-out'
    import { getContext } from 'svelte'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { user }: { user: { name: string; email: string } } = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const sidebar = useSidebar()
    const signOut = getContext<() => void>('signOut')
</script>

<Sidebar.Menu>
    <Sidebar.MenuItem>
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                {#snippet child({ props })}
                    <Sidebar.MenuButton
                        size="lg"
                        class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        {...props}
                    >
                        <Avatar.Root class="size-8 rounded-lg">
                            <Avatar.Image alt={user.name} />
                            <Avatar.Fallback class="rounded-lg"
                                >CN</Avatar.Fallback
                            >
                        </Avatar.Root>
                        <div
                            class="grid flex-1 text-left text-sm leading-tight"
                        >
                            <span class="truncate font-medium">{user.name}</span
                            >
                            <span class="truncate text-xs">{user.email}</span>
                        </div>
                        <ChevronsUpDownIcon class="ml-auto size-4" />
                    </Sidebar.MenuButton>
                {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content
                class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
                side={sidebar.isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
            >
                <DropdownMenu.Label class="p-0 font-normal">
                    <div
                        class="flex items-center gap-2 px-1 py-1.5 text-left text-sm"
                    >
                        <Avatar.Root class="size-8 rounded-lg">
                            <Avatar.Image alt={user.name} />
                            <Avatar.Fallback class="rounded-lg"
                                >CN</Avatar.Fallback
                            >
                        </Avatar.Root>
                        <div
                            class="grid flex-1 text-left text-sm leading-tight"
                        >
                            <span class="truncate font-medium">{user.name}</span
                            >
                            <span class="truncate text-xs">{user.email}</span>
                        </div>
                    </div>
                </DropdownMenu.Label>
                <DropdownMenu.Separator />
                <DropdownMenu.Group>
                    <DropdownMenu.Item>
                        <BadgeCheckIcon />
                        Account
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onclick={signOut}>
                    <LogOutIcon />
                    Sign out
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </Sidebar.MenuItem>
</Sidebar.Menu>
