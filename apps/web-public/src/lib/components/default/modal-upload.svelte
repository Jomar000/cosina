<script lang="ts">
    import CircleXIcon from '@lucide/svelte/icons/circle-x'
    import PaperClipIcon from '@lucide/svelte/icons/paperclip'
    import Trash2Icon from '@lucide/svelte/icons/trash-2'

    import Badge from '$lib/components/shadcn/badge/badge.svelte'
    import { Button } from '$lib/components/shadcn/button'
    import * as Dialog from '$lib/components/shadcn/dialog'
    import { Switch } from '$lib/components/shadcn/switch'
    import * as Tooltip from '$lib/components/shadcn/tooltip'
    import { nanoidCustom, objectStorageClient } from '$lib/utilities'

    ////////////////
    // Properties //
    ////////////////

    let {
        cid = nanoidCustom(4),
        open = $bindable(false),
        onUploadCompleted = () => {},
        uploadQueue = [],
    }: {
        cid?: string
        open: boolean
        onUploadCompleted: (uploadId?: string) => void
        uploadQueue: {
            name: string
            preview: string
            file: File
            isPublic: boolean
            status: string
        }[]
    } = $props()

    ////////////////////
    // Initialization //
    ////////////////////

    let isPublic = $state(false)

    //////////////
    // Handlers //
    //////////////

    const clearQueue = () => {
        uploadQueue = []
    }

    const handleFileChange = (event: Event) => {
        const files = (event.target as HTMLInputElement)?.files

        if (files) {
            const newFiles = Array.from(files).map((file) => ({
                name: file.name,
                preview: URL.createObjectURL(file),
                file,
                isPublic,
                status: 'QUEUED',
            }))

            uploadQueue = [
                ...uploadQueue,
                ...newFiles,
            ]
        }
    }

    const handlePublicCheckedChange = () => {
        uploadQueue = uploadQueue.map((item) => {
            return {
                ...item,
                isPublic,
            }
        })
    }

    const removeFromQueue = (index: number) => {
        uploadQueue = uploadQueue.filter((_, i) => i !== index)
    }

    const processQueue = async () => {
        const oscResponse = await objectStorageClient(uploadQueue)

        if (oscResponse) {
            for (const index of Object.keys(oscResponse.status)) {
                uploadQueue[Number(index)].status = oscResponse.status[index]
            }
        }

        onUploadCompleted(oscResponse?.uploadId)
    }
</script>

<Dialog.Root {open}>
    <Dialog.Portal>
        <Dialog.Overlay class="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
            class="fixed top-1/2 left-1/2 z-50 w-[90%] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg border border-neutral-300 bg-white p-6 shadow-lg dark:border-neutral-600 dark:bg-neutral-900"
            escapeKeydownBehavior="ignore"
            interactOutsideBehavior="ignore"
            showCloseButton={false}
        >
            <div class="flex w-full items-center justify-between">
                <Dialog.Title class=" text-center text-lg font-semibold">
                    Upload Attachments
                </Dialog.Title>
                <Dialog.Close
                    class="cursor-pointer rounded-full  p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                    onclick={() => (open = false)}
                    ><CircleXIcon
                        class=" text-neutral-600  dark:text-neutral-300 "
                    /></Dialog.Close
                >
            </div>
            <div class="flex min-h-[525px] w-full flex-col items-center gap-4">
                <button
                    onclick={() =>
                        document.getElementById(`fileInput-${cid}`)!.click()}
                    class="flex w-full items-center justify-center"
                >
                    <label
                        for="dropzone-file"
                        class="flex h-44 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-neutral-500 dark:hover:bg-neutral-600"
                    >
                        <div
                            class="flex flex-col items-center justify-center pt-5 pb-6"
                        >
                            <svg
                                class="mb-4 h-8 w-8 text-gray-500 dark:text-neutral-400"
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 20 16"
                            >
                                <path
                                    stroke="currentColor"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                                />
                            </svg>
                            <p
                                class="mb-2 text-sm text-gray-500 dark:text-neutral-400"
                            >
                                <span class="font-semibold"
                                    >Click to queue or drag and drop</span
                                >
                            </p>
                            <p
                                class="text-xs text-gray-500 dark:text-neutral-400"
                            >
                                SVG, PNG, JPG or GIF (MAX. 800x400px)
                            </p>
                        </div>
                        <input
                            accept="image/*"
                            class="hidden"
                            id="fileInput-{cid}"
                            multiple
                            onchange={handleFileChange}
                            type="file"
                        />
                    </label>
                </button>
                <div
                    class=" flex w-full items-center justify-between border-t border-neutral-300 dark:border-neutral-400"
                >
                    <h4
                        class="pt-4 text-sm font-semibold text-neutral-700 dark:text-neutral-300"
                    >
                        Queued Attachments ({uploadQueue.length})
                    </h4>
                    <button
                        onclick={clearQueue}
                        class={uploadQueue.length === 0
                            ? 'cursor-not-allowed pt-4 text-xs font-semibold text-neutral-700 opacity-50  dark:text-neutral-300'
                            : 'cursor-pointer pt-4 text-xs font-semibold text-neutral-700 hover:underline dark:text-neutral-300'}
                    >
                        Clear All
                    </button>
                </div>
                {#if uploadQueue.length > 0}
                    <div class=" w-full">
                        <div
                            class="flex h-58 w-full flex-col gap-2 overflow-y-auto"
                        >
                            {#each uploadQueue as uq, index (index)}
                                <div
                                    class="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 p-2 transition hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                                >
                                    <div>
                                        <Tooltip.Provider>
                                            <Tooltip.Root>
                                                <Tooltip.Trigger>
                                                    <div
                                                        class="flex items-center gap-3"
                                                    >
                                                        {#if uq.file.type.startsWith('image/')}
                                                            <img
                                                                src={uq.preview}
                                                                alt={uq.name}
                                                                class="h-12 max-w-12 min-w-12 rounded border object-cover"
                                                            />
                                                        {:else}
                                                            <div
                                                                class="flex h-12 w-12 items-center justify-center rounded border bg-neutral-100 dark:bg-neutral-700"
                                                            >
                                                                <PaperClipIcon
                                                                    class="h-6 w-6 text-neutral-500 dark:text-neutral-300"
                                                                />
                                                            </div>
                                                        {/if}
                                                        <div
                                                            class="flex w-full flex-col"
                                                        >
                                                            <p
                                                                class="w-24 truncate text-start text-sm text-neutral-700 md:w-64 dark:text-neutral-300"
                                                            >
                                                                {uq.name}
                                                            </p>
                                                            {#if uq.status === 'UPLOADED' || uq.status === 'CONFLICT'}
                                                                <Badge
                                                                    variant="secondary"
                                                                    class="bg-green-500 "
                                                                    >UPLOADED</Badge
                                                                >
                                                            {:else if uq.status === 'FAILED' || uq.status === 'INVALID'}
                                                                <Badge
                                                                    variant="destructive"
                                                                    >{uq.status}</Badge
                                                                >
                                                            {:else}
                                                                <Badge
                                                                    variant="default"
                                                                    >{uq.status}</Badge
                                                                >
                                                            {/if}
                                                        </div>
                                                    </div>
                                                </Tooltip.Trigger>
                                                <Tooltip.Content>
                                                    <p>{uq.name}</p>
                                                </Tooltip.Content>
                                            </Tooltip.Root>
                                        </Tooltip.Provider>
                                    </div>
                                    <div>
                                        <Button
                                            variant="default"
                                            class="cursor-pointer bg-transparent text-xs hover:bg-neutral-100 dark:hover:bg-neutral-600"
                                            onclick={() =>
                                                removeFromQueue(index)}
                                        >
                                            <Trash2Icon class="text-red-400" />
                                        </Button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {:else}
                    <div class="mb-16 flex h-full items-center justify-center">
                        <p class="text-neutral-600 dark:text-neutral-400">
                            No attachments queued
                        </p>
                    </div>
                {/if}
                <div
                    class="absolute bottom-4 flex w-full justify-between px-6 py-2"
                >
                    <div class="flex items-center space-x-2">
                        <Switch
                            disabled={uploadQueue.length === 0}
                            class={uploadQueue.length === 0
                                ? 'cursor-not-allowed opacity-50'
                                : ''}
                            bind:checked={isPublic}
                            onCheckedChange={handlePublicCheckedChange}
                        />
                        <p
                            class={`text-xs text-neutral-600 dark:text-neutral-300 ${uploadQueue.length === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
                        >
                            Public
                        </p>
                    </div>
                    <Button
                        class={uploadQueue.length === 0
                            ? 'inline-flex cursor-not-allowed items-center rounded-lg bg-blue-700 px-4 py-2 text-center text-sm font-medium text-white opacity-50 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'
                            : 'inline-flex cursor-pointer items-center rounded-lg bg-blue-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800'}
                        variant="default"
                        onclick={processQueue}
                        disabled={uploadQueue.length === 0}
                    >
                        Upload
                    </Button>
                </div>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
