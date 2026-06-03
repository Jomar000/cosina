<script lang="ts">
    import * as Avatar from '@hyperion/ui/components/avatar'
    import { Badge } from '@hyperion/ui/components/badge'
    import { Button } from '@hyperion/ui/components/button'
    import * as Card from '@hyperion/ui/components/card'
    import * as DropdownMenu from '@hyperion/ui/components/dropdown-menu'
    import * as Table from '@hyperion/ui/components/table'
    import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
    import CircleXIcon from '@lucide/svelte/icons/circle-x'
    import CloudUploadIcon from '@lucide/svelte/icons/cloud-upload'
    import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical'
    import FileIcon from '@lucide/svelte/icons/file'
    import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
    import Trash2Icon from '@lucide/svelte/icons/trash-2'
    import { onDestroy, onMount } from 'svelte'

    import { formatBytes } from '$lib/utilities/helpers'
    import {
        createUploadId,
        getUploadMode,
        prepareUploadFiles,
        removeUploadFile,
        retryUploadFile,
        revokePreviewUrls,
        uploadQueuedFiles,
        type UploadMetadata,
    } from './utilities/tableUpload'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        allowedMimeTypes = [],
        maxItems = 10,
        uploadId = $bindable(''),
    }: {
        allowedMimeTypes?: string[]
        maxItems?: number
        uploadId?: string
    } = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    /**
     * @description
     * When an uploadId is passed to this component,
     * assume that the operating mode is UPDATE.
     *
     * In the UPDATE opMode, the component retrieves the associated
     * objects with the provided uploadId and displays it on the table.
     *
     * Once an action is triggered, either a new file is uploaded or the table
     * was cleared, a new uploadId is requested and all succeeding changes are
     * saved into this new uploadId.
     *
     * Otherwise, opMode is NEW.
     * Generate a new uploadId and propagate to the parent component.
     */
    const opMode = getUploadMode(uploadId)

    ///////////////
    // 03. State //
    ///////////////

    let fileList: UploadMetadata[] = $state([])
    let addedToList: UploadMetadata[] = $state([])

    /////////////////
    // 08. Effects //
    /////////////////

    onMount(async () => {
        if (opMode === 'NEW') {
            uploadId = await createUploadId()
        } else {
            // TODO: Populate fileList with existing data
        }
    })

    onDestroy(() => revokePreviewUrls(fileList))

    //////////////////
    // 09. Handlers //
    //////////////////

    async function handleFileInputChange(event: Event) {
        const selectedFiles = (event.target as HTMLInputElement)?.files
        addedToList = []

        if (!selectedFiles) return

        const result = await prepareUploadFiles({
            allowedMimeTypes,
            existingFiles: fileList,
            maxItems,
            selectedFiles,
        })

        if (result.maxItemsReached) {
            // TODO: Add alert banner or modal here.
            alert(`Maximum of ${maxItems} files only.`)
        }

        addedToList = result.queuedFiles
        if (addedToList.length === 0) return

        fileList = [
            ...fileList,
            ...addedToList,
        ]

        await uploadQueuedFiles({
            queuedFiles: addedToList,
            uploadId,
        })
    }

    async function handleFileRetry(index: number) {
        await retryUploadFile({
            file: fileList[index],
            uploadId,
        })
    }

    function handleOpenFileInput() {
        document.getElementById('fileInput')?.click()
    }

    function handleFileRetrySelect(event: Event) {
        const index = Number((event.currentTarget as HTMLElement).dataset.index)
        void handleFileRetry(index)
    }

    function handleRemoveFileSelect(event: Event) {
        const hashSha256 = (event.currentTarget as HTMLElement).dataset.hash
        if (hashSha256) {
            removeFile(hashSha256)
        }
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function clearFiles() {
        revokePreviewUrls(fileList)
        fileList = []
    }

    function removeFile(hashSha256: string) {
        fileList = removeUploadFile(fileList, hashSha256)
    }
</script>

<div class="p-4 sm:p-6 lg:p-8">
    <Card.Root class="w-full">
        <Card.Header class="flex flex-row items-center justify-between">
            <div class="flex flex-col gap-y-1.5">
                <Card.Title>File Uploads</Card.Title>
                <Card.Description
                    >Manage your uploaded files here.</Card.Description
                >
            </div>
            <div class="flex items-center gap-x-4">
                <Button
                    disabled={fileList.length === 0}
                    onclick={clearFiles}
                    variant="outline"
                >
                    <Trash2Icon class="mr-2 size-4 " />
                    Clear All</Button
                >
                <Button onclick={handleOpenFileInput}>
                    <CloudUploadIcon class="mr-2 size-4 " />
                    Upload
                </Button>
            </div>
        </Card.Header>
        <Card.Content>
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head class="w-20">Preview</Table.Head>
                        <Table.Head>Filename</Table.Head>
                        <Table.Head class="w-30">Size</Table.Head>
                        <Table.Head class="w-37.5">Status</Table.Head>
                        <Table.Head class="w-25 text-right">Actions</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#each fileList as p, i (p.hashSha256)}
                        <Table.Row>
                            <Table.Cell>
                                <Avatar.Root class="size-10  rounded-md">
                                    {#if p.previewUrl}
                                        <Avatar.Image
                                            src={p.previewUrl}
                                            alt={p.file.name}
                                            class="rounded-md object-cover"
                                        />
                                    {/if}
                                    <Avatar.Fallback
                                        class="rounded-md bg-muted"
                                    >
                                        <FileIcon
                                            class="size-5  text-muted-foreground"
                                        />
                                    </Avatar.Fallback>
                                </Avatar.Root>
                            </Table.Cell>
                            <Table.Cell class="font-medium"
                                >{p.file.name}</Table.Cell
                            >
                            <Table.Cell class="text-muted-foreground"
                                >{formatBytes(p.file.size)}</Table.Cell
                            >
                            <Table.Cell>
                                {#if p.status === 'UPLOADED'}
                                    <Badge
                                        variant="default"
                                        class="bg-green-500 hover:bg-green-600"
                                    >
                                        <CircleCheckIcon
                                            class="mr-1.5 size-3.5 "
                                        />
                                        UPLOADED
                                    </Badge>
                                {:else if p.status === 'FAILED'}
                                    <Badge variant="destructive">
                                        <CircleXIcon class="mr-1.5 size-3.5 " />
                                        FAILED
                                    </Badge>
                                {:else}
                                    <Badge variant="outline">QUEUED</Badge>
                                {/if}
                            </Table.Cell>
                            <Table.Cell class="text-right">
                                <DropdownMenu.Root>
                                    <DropdownMenu.Trigger>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                        >
                                            <EllipsisVerticalIcon
                                                class="size-4 "
                                            />
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content>
                                        {#if p.status === 'FAILED'}
                                            <DropdownMenu.Item
                                                data-index={i}
                                                onclick={handleFileRetrySelect}
                                            >
                                                <RefreshCwIcon
                                                    class="mr-2 size-4 "
                                                />
                                                Retry
                                            </DropdownMenu.Item>
                                        {/if}
                                        <DropdownMenu.Item
                                            data-hash={p.hashSha256}
                                            onclick={handleRemoveFileSelect}
                                        >
                                            <Trash2Icon class="mr-2 size-4 " />
                                            Delete
                                        </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                </DropdownMenu.Root>
                            </Table.Cell>
                        </Table.Row>
                    {/each}
                </Table.Body>
            </Table.Root>
            <input
                class="hidden"
                id="fileInput"
                multiple
                onchange={handleFileInputChange}
                type="file"
            />
        </Card.Content>
    </Card.Root>
</div>
