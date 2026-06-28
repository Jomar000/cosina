<script lang="ts">
    import * as Avatar from '@cosina/ui/components/avatar'
    import { Button } from '@cosina/ui/components/button'
    import * as DropdownMenu from '@cosina/ui/components/dropdown-menu'
    import * as Tooltip from '@cosina/ui/components/tooltip'
    import BellIcon from '@lucide/svelte/icons/bell'
    import LogOutIcon from '@lucide/svelte/icons/log-out'
    import SettingsIcon from '@lucide/svelte/icons/settings'
    import UserIcon from '@lucide/svelte/icons/user'
    import { getContext } from 'svelte'

    import { page } from '$app/state'
    import type { SessionState } from '$lib/states/session'
    import { getRouteMeta } from './navigation'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { role, session }: { role: string; session: SessionState } = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const signOut = getContext<() => Promise<void> | void>('signOut')

    /////////////////
    // 04. Derived //
    /////////////////

    const routeMeta = $derived(getRouteMeta(page.url.pathname))
    const initials = $derived(getInitials(session.data.name))

    //////////////////
    // 09. Handlers //
    //////////////////

    function handleSignOut() {
        void signOut()
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function getInitials(name: string) {
        return name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join('')
    }
</script>

<header
    class="flex h-15 shrink-0 items-center gap-4 border-b border-border bg-background px-4 sm:px-6"
>
    <div class="mr-auto flex min-w-0 flex-col justify-center">
        {#if routeMeta.breadcrumb?.length}
            <div
                class="mb-0.5 flex items-center gap-1 text-[11px] leading-tight text-muted-foreground"
            >
                {#each routeMeta.breadcrumb as crumb, index (crumb)}
                    {#if index > 0}<span class="opacity-40">/</span>{/if}
                    <span>{crumb}</span>
                {/each}
            </div>
        {/if}
        <h1
            class="truncate text-[15px] leading-tight font-semibold text-foreground"
        >
            {routeMeta.title}
        </h1>
    </div>

    <Tooltip.Root>
        <Tooltip.Trigger>
            {#snippet child({ props })}
                <Button
                    {...props}
                    aria-label="Notifications"
                    class="relative"
                    size="icon"
                    variant="ghost"
                >
                    <BellIcon class="size-4" />
                    <span
                        class="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary"
                    ></span>
                </Button>
            {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content>Notifications</Tooltip.Content>
    </Tooltip.Root>

    <DropdownMenu.Root>
        <DropdownMenu.Trigger>
            {#snippet child({ props })}
                <Button
                    {...props}
                    aria-label="User menu"
                    class="h-8 gap-2 px-2"
                    variant="ghost"
                >
                    <Avatar.Root class="size-7">
                        <Avatar.Image
                            alt={session.data.name}
                            src={session.data.avatar}
                        />
                        <Avatar.Fallback
                            class="bg-primary text-[11px] font-semibold text-primary-foreground"
                        >
                            {initials || 'HY'}
                        </Avatar.Fallback>
                    </Avatar.Root>
                    <span
                        class="hidden max-w-40 truncate text-sm font-medium sm:block"
                    >
                        {session.data.name}
                    </span>
                </Button>
            {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
            align="end"
            class="w-52"
        >
            <DropdownMenu.Label class="flex flex-col">
                <span class="truncate font-medium">{session.data.name}</span>
                <span
                    class="truncate text-xs font-normal text-muted-foreground"
                >
                    {role.charAt(0).toUpperCase() + role.slice(1)} - {session
                        .data.email}
                </span>
            </DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Item disabled>
                <UserIcon /> Profile
            </DropdownMenu.Item>
            <DropdownMenu.Item disabled>
                <SettingsIcon /> Settings
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
                class="text-destructive"
                onclick={handleSignOut}
            >
                <LogOutIcon /> Sign out
            </DropdownMenu.Item>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
</header>
