<script lang="ts">
    import AppLayout from '$lib/modules/app/components/AppLayout.svelte'

    let { children } = $props()
</script>

<AppLayout {children} />
