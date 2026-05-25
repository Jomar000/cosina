<script lang="ts">
    import '../app.css'
    import AppRootLayout from '$lib/modules/app/components/AppRootLayout.svelte'

    let { children } = $props()

    const isStagingBuild = import.meta.env.MODE === 'staging'
</script>

{#if isStagingBuild}
    <div
        aria-hidden="true"
        class="pointer-events-none fixed inset-0 z-2147483647 border-4 border-yellow-400"
    ></div>
{/if}

<AppRootLayout {children} />
