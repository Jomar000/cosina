<script lang="ts">
    import { IMG_logo } from '$lib/assets/image/index'
    import * as Sidebar from '@hyperion/ui/components/sidebar'
</script>

<Sidebar.Menu>
    <Sidebar.MenuItem>
        <Sidebar.MenuButton
            size="lg"
            class="pointer-events-none select-none py-3 hover:bg-transparent active:bg-transparent"
        >
            <!-- Logo with ring glow -->
            <div
                class="relative flex size-9 shrink-0 items-center justify-center"
            >
                <div
                    class="absolute inset-0 rounded-xl bg-blue-500/15 ring-1 ring-blue-500/30 ring-offset-0"
                ></div>
                <img
                    src={IMG_logo}
                    alt="Cosina logo"
                    class="relative size-8 rounded-lg object-cover"
                />
            </div>

            <!-- Brand text -->
            <div class="grid flex-1 text-left leading-tight">
                <span class="truncate text-sm font-bold tracking-tight"
                    >Cosina</span
                >
                <span class="truncate text-[11px] font-medium text-blue-400/80"
                    >Admin Dashboard</span
                >
            </div>
        </Sidebar.MenuButton>
    </Sidebar.MenuItem>
</Sidebar.Menu>
