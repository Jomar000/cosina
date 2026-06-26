<script lang="ts">
    import { Checkbox } from '@hyperion/ui/components/checkbox'
    import { Label } from '@hyperion/ui/components/label'

    import MultiFileUpload from '$lib/components/upload/MultiFileUpload.svelte'
    import SingleFileUpload from '$lib/components/upload/SingleFileUpload.svelte'

    ///////////////
    // 03. State //
    ///////////////

    let isMultiCommitted = $state(false)
    let isMultiPublic = $state(false)
    let isSingleCommitted = $state(false)
    let isSinglePublic = $state(false)
    let multiUploadId = $state('')
    let singleObjectId = $state('')
    let singleUploadId = $state('')
</script>

<div class="flex min-h-svh flex-col gap-6 p-4 md:p-6">
    <header class="space-y-1">
        <h1 class="text-2xl font-semibold tracking-normal">Object Storage</h1>
        <p class="text-sm text-muted-foreground">
            Upload files through the object storage flow.
        </p>
    </header>

    <section class="grid gap-6 xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <div class="space-y-3">
            <div class="flex items-center gap-2">
                <Checkbox
                    id="single-public"
                    bind:checked={isSinglePublic}
                />
                <Label for="single-public">Public object</Label>
            </div>
            <SingleFileUpload
                bind:isCommitted={isSingleCommitted}
                bind:objectId={singleObjectId}
                bind:uploadId={singleUploadId}
                isPublic={isSinglePublic}
            />
            <pre
                class="overflow-auto rounded-md border bg-muted p-3 text-xs text-muted-foreground">singleUploadId: {singleUploadId ||
                    'pending'}
singleObjectId: {singleObjectId || 'pending'}
singlePublic: {String(isSinglePublic)}
singleCommitted: {String(isSingleCommitted)}</pre>
        </div>

        <div class="space-y-3">
            <div class="flex items-center gap-2">
                <Checkbox
                    id="multi-public"
                    bind:checked={isMultiPublic}
                />
                <Label for="multi-public">Public objects</Label>
            </div>
            <MultiFileUpload
                bind:isCommitted={isMultiCommitted}
                bind:uploadId={multiUploadId}
                isPublic={isMultiPublic}
                maxItems={10}
            />
            <pre
                class="overflow-auto rounded-md border bg-muted p-3 text-xs text-muted-foreground">multiUploadId: {multiUploadId ||
                    'pending'}
multiPublic: {String(isMultiPublic)}
multiCommitted: {String(isMultiCommitted)}</pre>
        </div>
    </section>
</div>
