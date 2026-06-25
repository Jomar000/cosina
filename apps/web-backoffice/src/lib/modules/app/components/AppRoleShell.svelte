<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import * as Sheet from '@hyperion/ui/components/sheet'
    import * as Tooltip from '@hyperion/ui/components/tooltip'
    import MenuIcon from '@lucide/svelte/icons/menu'
    import type { Snippet } from 'svelte'

    import { page } from '$app/state'
    import AppSidebar from '$lib/components/sidebar/Sidebar.svelte'
    import {
        createRoleNavigation,
        getRouteMeta,
    } from '$lib/components/sidebar/navigation'
    import SiteHeader from '$lib/components/sidebar/SiteHeader.svelte'
    import { useSessionContext } from '$lib/states/session'

    type Role = 'admin' | 'member' | 'owner'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        role,
        children,
    }: {
        role: Role
        children: Snippet
    } = $props()

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()
    let collapsed = $state(false)
    let mobileOpen = $state(false)

    /////////////////
    // 04. Derived //
    /////////////////

    const navItems = $derived(createRoleNavigation(role))
    const routeMeta = $derived(getRouteMeta(page.url.pathname))

    //////////////////
    // 09. Handlers //
    //////////////////

    function closeMobileNavigation() {
        mobileOpen = false
    }
</script>

<Tooltip.Provider delayDuration={300}>
    <div class="flex h-svh w-full overflow-hidden bg-background">
        <div class="hidden h-full shrink-0 md:flex">
            <AppSidebar
                bind:collapsed
                {navItems}
            />
        </div>

        <Sheet.Root bind:open={mobileOpen}>
            <Sheet.Content
                class="w-60! max-w-60! gap-0 border-r-0 p-0"
                showCloseButton={false}
                side="left"
            >
                <Sheet.Title class="sr-only">Navigation</Sheet.Title>
                <AppSidebar
                    class="w-full border-r-0"
                    mobile
                    {navItems}
                    onNavigate={closeMobileNavigation}
                />
            </Sheet.Content>
        </Sheet.Root>

        <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div
                class="flex h-[60px] shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:hidden"
            >
                <Button
                    aria-label="Open navigation"
                    onclick={() => (mobileOpen = true)}
                    size="icon"
                    variant="ghost"
                >
                    <MenuIcon class="size-5" />
                </Button>
                <span class="truncate text-sm font-semibold text-foreground">
                    {routeMeta.title}
                </span>
            </div>

            <div class="hidden shrink-0 md:block">
                <SiteHeader
                    {role}
                    {session}
                />
            </div>

            <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
                {@render children()}
            </main>
        </div>
    </div>
</Tooltip.Provider>
