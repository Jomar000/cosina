<script lang="ts">
    import { Button } from '@cosina/ui/components/button'
    import * as Tooltip from '@cosina/ui/components/tooltip'
    import { cn } from '@cosina/ui/utils'
    import MoonIcon from '@lucide/svelte/icons/moon'
    import SunIcon from '@lucide/svelte/icons/sun'
    import { mode, toggleMode } from 'mode-watcher'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let { class: className }: { class?: string } = $props()
</script>

<Tooltip.Root>
    <Tooltip.Trigger>
        {#snippet child({ props })}
            <Button
                {...props}
                aria-label={`Switch to ${mode.current === 'dark' ? 'light' : 'dark'} mode`}
                class={cn('size-8', className)}
                onclick={toggleMode}
                size="icon"
                variant="ghost"
            >
                {#if mode.current === 'dark'}
                    <SunIcon class="size-4" />
                {:else}
                    <MoonIcon class="size-4" />
                {/if}
            </Button>
        {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content side="right">
        Switch to {mode.current === 'dark' ? 'light' : 'dark'} mode
    </Tooltip.Content>
</Tooltip.Root>
