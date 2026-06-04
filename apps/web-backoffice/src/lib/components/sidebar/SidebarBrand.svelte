<script lang="ts">
    import * as Sidebar from '@hyperion/ui/components/sidebar'
    import UtensilsCrossedIcon from '@lucide/svelte/icons/utensils-crossed'
</script>

<Sidebar.Menu>
    <Sidebar.MenuItem>
        <Sidebar.MenuButton
            size="lg"
            class="pointer-events-none select-none"
        >
            <div
                class="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"
            >
                <UtensilsCrossedIcon class="size-4" />
            </div>
            <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">Cosina Admin</span>
                <span class="truncate text-xs text-sidebar-foreground/60"
                    >Ordering System</span
                >
            </div>
        </Sidebar.MenuButton>
    </Sidebar.MenuItem>
</Sidebar.Menu>
