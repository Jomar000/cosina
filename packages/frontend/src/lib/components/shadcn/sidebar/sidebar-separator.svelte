<script lang="ts">
    import { Separator } from '$lib/components/shadcn/separator'
    import { cn } from '$lib/shadcn.js'
    import type { ComponentProps } from 'svelte'

    let {
        ref = $bindable(null),
        class: className,
        ...restProps
    }: ComponentProps<typeof Separator> = $props()
</script>

<Separator
    bind:ref
    data-slot="sidebar-separator"
    data-sidebar="separator"
    class={cn('bg-sidebar-border', className)}
    {...restProps}
/>
