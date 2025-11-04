<script lang="ts">
    import { Button } from '$lib/components/shadcn/button/index.js'
    import { objectStorageClient } from '$lib/utilities'

    let uploadQueue = $state<
        { name: string; preview: string; file: File; isPublic: boolean }[]
    >([])

    const handleFileChange = (event: Event) => {
        const files = (event.target as HTMLInputElement)?.files
        if (files && files.length > 0) {
            const newFiles = Array.from(files).map((file) => ({
                name: file.name,
                preview: URL.createObjectURL(file),
                file,
                isPublic: false,
            }))
            uploadQueue = [
                ...uploadQueue,
                ...newFiles,
            ]
        }
    }

    const removeFile = (index: number) => {
        uploadQueue = uploadQueue.filter((_, i) => i !== index)
    }

    const clearAll = () => {
        uploadQueue = []
    }

    const upload = async () => {
        await objectStorageClient(uploadQueue)
    }
</script>

<div
    class="relative flex min-h-screen w-full items-center justify-center bg-neutral-50 dark:bg-neutral-800"
>
    <div class="container w-full rounded-lg bg-white p-6 shadow lg:w-1/3">
        <h3 class="mb-6 text-center text-lg font-medium text-neutral-800">
            Upload Attachments
        </h3>
        <div class="flex flex-col items-center gap-4">
            <input
                type="file"
                multiple
                accept="image/*"
                class="hidden"
                id="fileInput"
                onchange={handleFileChange}
            />
            <Button
                onclick={() => document.getElementById('fileInput')?.click()}
                class="w-full"
            >
                Choose
            </Button>
            {#if uploadQueue.length > 0}
                <div class="mt-6 w-full border-t border-neutral-200 pt-4">
                    <h4 class="mb-3 text-sm font-semibold text-neutral-700">
                        Queued Files ({uploadQueue.length})
                    </h4>
                    <div class="flex max-h-64 flex-col gap-3 overflow-y-auto">
                        {#each uploadQueue as file, index (file.preview)}
                            <div
                                class="flex items-center justify-between rounded-md border border-neutral-200 p-2 transition hover:bg-neutral-50"
                            >
                                <div class="flex items-center gap-3">
                                    <img
                                        src={file.preview}
                                        alt={file.name}
                                        class="h-12 w-12 rounded border object-cover"
                                    />
                                    <p
                                        class="w-40 truncate text-sm text-neutral-700"
                                    >
                                        {file.name}
                                    </p>
                                </div>
                                <Button
                                    variant="default"
                                    class="cursor-pointer bg-red-600 text-xs hover:bg-red-700"
                                    onclick={() => removeFile(index)}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="36"
                                        height="36"
                                        viewBox="0 0 36 36"
                                        ><path
                                            fill="currentColor"
                                            d="m19.61 18l4.86-4.86a1 1 0 0 0-1.41-1.41l-4.86 4.81l-4.89-4.89a1 1 0 0 0-1.41 1.41L16.78 18L12 22.72a1 1 0 1 0 1.41 1.41l4.77-4.77l4.74 4.74a1 1 0 0 0 1.41-1.41Z"
                                            class="clr-i-outline clr-i-outline-path-1"
                                        /><path
                                            fill="currentColor"
                                            d="M18 34a16 16 0 1 1 16-16a16 16 0 0 1-16 16m0-30a14 14 0 1 0 14 14A14 14 0 0 0 18 4"
                                            class="clr-i-outline clr-i-outline-path-2"
                                        /><path
                                            fill="none"
                                            d="M0 0h36v36H0z"
                                        /></svg
                                    >
                                </Button>
                            </div>
                        {/each}
                    </div>
                    <div class="mt-4 flex justify-between">
                        <Button
                            class="cursor-pointer  bg-blue-600 hover:bg-blue-700"
                            variant="default"
                            onclick={upload}>Upload</Button
                        >
                        <Button
                            variant="default"
                            onclick={clearAll}>Clear All</Button
                        >
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>
