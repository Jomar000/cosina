<script lang="ts">
    import '../app.css'
    import AppRootLayout from '$lib/modules/app/components/AppRootLayout.svelte'

    let { children } = $props()
</script>

<AppRootLayout {children} />
