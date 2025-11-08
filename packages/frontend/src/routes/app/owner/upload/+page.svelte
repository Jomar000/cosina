<script lang="ts">
    import UploadModal from '$lib/components/default/modal-upload.svelte'

    const onUploadCompleted = (uploadId?: string) => {
        console.log(`UPLOAD COMPLETED ${uploadId}`)
        open = false
    }

    let open = $state(false)
    let uploadQueue = $state([])
</script>

<UploadModal
    bind:open
    {onUploadCompleted}
    {uploadQueue}
/>

<button onclick={() => (open = true)}>CLICK ME</button>
