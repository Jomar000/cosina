<script lang="ts">
    // Use IconProps from the public @lucide/svelte entry instead of
    // ComponentProps<typeof Loader2Icon> — the latter resolves through
    // @lucide/svelte/dist/types (not in the exports map), causing
    // svelte-package to fail .d.ts generation with "inferred type cannot be named".
    // https://github.com/huntabyte/shadcn-svelte/issues/2556
    import type { IconProps } from '@lucide/svelte'

    import { cn } from '$lib/utils.js'
    import Loader2Icon from '@lucide/svelte/icons/loader-2'

    let { class: className, ...restProps }: IconProps = $props()
</script>

<Loader2Icon
    role="status"
    aria-label="Loading"
    class={cn('size-4 animate-spin', className)}
    {...restProps}
/>
