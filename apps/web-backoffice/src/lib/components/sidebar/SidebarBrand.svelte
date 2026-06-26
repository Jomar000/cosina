<script lang="ts">
    import { IMG_logo } from '$lib/assets/image/index'
    import * as Sidebar from '@hyperion/ui/components/sidebar'
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
                <div class="flex h-9 w-9 items-center justify-center">
                    <img
                        src={IMG_logo}
                        alt="Cosina logo"
                        class="w-full h-full rounded-full"
                    />
                </div>
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
