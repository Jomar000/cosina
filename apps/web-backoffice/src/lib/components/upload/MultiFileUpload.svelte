<script lang="ts">
    import * as Alert from '@hyperion/ui/components/alert'
    import * as Avatar from '@hyperion/ui/components/avatar'
    import { Badge } from '@hyperion/ui/components/badge'
    import { Button } from '@hyperion/ui/components/button'
    import * as Card from '@hyperion/ui/components/card'
    import * as DropdownMenu from '@hyperion/ui/components/dropdown-menu'
    import { Progress } from '@hyperion/ui/components/progress'
    import * as Table from '@hyperion/ui/components/table'
    import { cn } from '@hyperion/ui/utils'
    import AlertCircleIcon from '@lucide/svelte/icons/alert-circle'
    import CheckCheckIcon from '@lucide/svelte/icons/check-check'
    import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
    import CircleXIcon from '@lucide/svelte/icons/circle-x'
    import CloudUploadIcon from '@lucide/svelte/icons/cloud-upload'
    import EllipsisVerticalIcon from '@lucide/svelte/icons/ellipsis-vertical'
    import FileIcon from '@lucide/svelte/icons/file'
    import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
    import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
    import Trash2Icon from '@lucide/svelte/icons/trash-2'
    import { createMutation } from '@tanstack/svelte-query'
    import { onDestroy, onMount } from 'svelte'
    import { toast } from 'svelte-sonner'
    import { v7 as uuidv7 } from 'uuid'

    import { formatBytes } from '$lib/utilities/helpers'
    import {
        commitUploadSession,
        createUploadId,
        getUploadMode,
        prepareUploadFiles,
        removeUploadFile,
        retryUploadFile,
        revokePreviewUrls,
        uploadQueuedFiles,
        type UploadMetadata,
    } from './utilities/multiFileUpload'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        allowedMimeTypes = [],
        class: className = '',
        disabled = false,
        isCommitted = $bindable(false),
        isPublic = false,
        maxItems = 10,
        onCommit,
        uploadId = $bindable(''),
    }: {
        allowedMimeTypes?: string[]
        class?: string
        disabled?: boolean
        isCommitted?: boolean
        isPublic?: boolean
        maxItems?: number
        onCommit?: (data: { attachments: string[]; uploadId: string }) => void
        uploadId?: string
    } = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const opMode = getUploadMode(uploadId)

    ///////////////
    // 03. State //
    ///////////////

    let createUploadIdempotencyKey = $state(uuidv7())
    let fileInput = $state<HTMLInputElement | null>(null)
    let fileList: UploadMetadata[] = $state([])
    let isActionLocked = $state(false)
    let uploadMessage = $state('')

    /////////////////
    // 04. Derived //
    /////////////////

    const acceptedMimeTypes = $derived(allowedMimeTypes.join(','))
    const completedFiles = $derived(
        fileList.filter((file) => file.status === 'UPLOADED'),
    )
    const failedFiles = $derived(
        fileList.filter((file) => file.status === 'FAILED'),
    )
    const pendingFiles = $derived(
        fileList.filter(
            (file) => file.status === 'QUEUED' || file.status === 'UPLOADING',
        ),
    )
    const progressValue = $derived(
        fileList.length === 0
            ? 0
            : Math.round((completedFiles.length / fileList.length) * 100),
    )
    const canCommit = $derived(
        !disabled &&
            !isActionLocked &&
            !isCommitted &&
            completedFiles.length > 0 &&
            pendingFiles.length === 0,
    )

    ///////////////////
    // 06. Mutations //
    ///////////////////

    const createUploadMutation = createMutation(() => ({
        mutationKey: [
            'objectStorage',
            'upload',
            'create',
        ],
        mutationFn: createUploadId,
    }))

    const uploadQueuedFilesMutation = createMutation(() => ({
        mutationKey: [
            'objectStorage',
            'upload',
            'attachment',
            'create',
        ],
        mutationFn: uploadQueuedFiles,
    }))

    const retryUploadFileMutation = createMutation(() => ({
        mutationKey: [
            'objectStorage',
            'upload',
            'attachment',
            'retry',
        ],
        mutationFn: retryUploadFile,
    }))

    const commitUploadMutation = createMutation(() => ({
        mutationKey: [
            'objectStorage',
            'upload',
            'commit',
        ],
        mutationFn: commitUploadSession,
    }))

    /////////////////
    // 08. Effects //
    /////////////////

    onMount(async () => {
        if (opMode !== 'NEW') return

        isActionLocked = true
        try {
            uploadId = await createUploadMutation.mutateAsync(
                createUploadIdempotencyKey,
            )
            createUploadIdempotencyKey = uuidv7()
        } catch (error) {
            uploadMessage = getErrorMessage(error)
        } finally {
            isActionLocked = false
        }
    })

    onDestroy(() => revokePreviewUrls(fileList))

    //////////////////
    // 09. Handlers //
    //////////////////

    async function handleCommitUpload() {
        if (!canCommit) return

        isActionLocked = true
        uploadMessage = ''

        try {
            const data = await commitUploadMutation.mutateAsync({
                uploadId,
                objectIds: completedFiles.map((file) => file.objectId),
            })

            isCommitted = true
            onCommit?.(data)
            toast.success('Upload committed')
        } catch (error) {
            uploadMessage = getErrorMessage(error)
        } finally {
            isActionLocked = false
        }
    }

    async function handleFileInputChange(event: Event) {
        if (disabled || isActionLocked || isCommitted) return

        const input = event.target as HTMLInputElement
        const selectedFiles = input.files
        if (!selectedFiles) return

        isActionLocked = true
        uploadMessage = ''

        try {
            await ensureUploadId()

            const result = await prepareUploadFiles({
                allowedMimeTypes,
                existingFiles: fileList,
                isPublic,
                maxItems,
                selectedFiles,
            })

            if (result.maxItemsReached) {
                uploadMessage = `Maximum of ${maxItems} files reached.`
            }

            if (result.queuedFiles.length === 0) return

            const queuedHashes = new Set(
                result.queuedFiles.map((file) => file.hashSha256),
            )

            fileList = [
                ...fileList,
                ...result.queuedFiles,
            ]

            const queuedFiles = fileList.filter((file) =>
                queuedHashes.has(file.hashSha256),
            )

            await uploadQueuedFilesMutation.mutateAsync({
                onFileChange: refreshFileList,
                queuedFiles,
                uploadId,
            })

            fileList = [...fileList]

            if (queuedFiles.some((file) => file.status === 'FAILED')) {
                uploadMessage = 'Some files failed to upload.'
            }
        } catch (error) {
            uploadMessage = getErrorMessage(error)
        } finally {
            input.value = ''
            isActionLocked = false
        }
    }

    async function handleFileRetry(index: number) {
        if (disabled || isActionLocked || isCommitted) return

        isActionLocked = true
        uploadMessage = ''

        try {
            await retryUploadFileMutation.mutateAsync({
                file: fileList[index],
                onFileChange: refreshFileList,
                uploadId,
            })
            fileList = [...fileList]
        } catch (error) {
            uploadMessage = getErrorMessage(error)
        } finally {
            isActionLocked = false
        }
    }

    async function handleFileRetrySelect(event: Event) {
        const index = Number((event.currentTarget as HTMLElement).dataset.index)
        await handleFileRetry(index)
    }

    function handleOpenFileInput() {
        if (disabled || isActionLocked || isCommitted) return
        fileInput?.click()
    }

    function handleRemoveFileSelect(event: Event) {
        if (disabled || isActionLocked || isCommitted) return

        const hashSha256 = (event.currentTarget as HTMLElement).dataset.hash
        if (hashSha256) {
            removeFile(hashSha256)
        }
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function clearFiles() {
        if (disabled || isCommitted) return

        revokePreviewUrls(fileList)
        fileList = []
        uploadMessage = ''
    }

    async function ensureUploadId() {
        if (uploadId !== '') return

        uploadId = await createUploadMutation.mutateAsync(
            createUploadIdempotencyKey,
        )
        createUploadIdempotencyKey = uuidv7()
    }

    function getErrorMessage(error: unknown) {
        if (error instanceof Error) return error.message
        return 'Upload action failed.'
    }

    function removeFile(hashSha256: string) {
        if (disabled || isActionLocked || isCommitted) return
        fileList = removeUploadFile(fileList, hashSha256)
    }

    function refreshFileList() {
        fileList = [...fileList]
    }
</script>

<Card.Root class={cn('w-full rounded-lg', className)}>
    <Card.Header class="gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div class="min-w-0">
            <Card.Title>File uploads</Card.Title>
            <Card.Description>
                {completedFiles.length}/{fileList.length} uploaded
            </Card.Description>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <Button
                disabled={disabled || isCommitted || fileList.length === 0}
                onclick={clearFiles}
                size="icon"
                variant="outline"
            >
                <Trash2Icon class="size-4" />
            </Button>
            <Button
                disabled={disabled || isActionLocked || isCommitted}
                onclick={handleOpenFileInput}
            >
                <CloudUploadIcon class="size-4" />
                Upload
            </Button>
            <Button
                disabled={!canCommit}
                onclick={handleCommitUpload}
                variant="secondary"
            >
                <CheckCheckIcon class="size-4" />
                Commit
            </Button>
        </div>
    </Card.Header>
    <Card.Content class="space-y-4">
        {#if uploadMessage}
            <Alert.Root variant="destructive">
                <AlertCircleIcon class="size-4" />
                <Alert.Title>Upload issue</Alert.Title>
                <Alert.Description>{uploadMessage}</Alert.Description>
            </Alert.Root>
        {/if}

        <div class="space-y-2">
            <Progress value={progressValue} />
            <div
                class="flex items-center justify-between text-xs text-muted-foreground"
            >
                <span>{failedFiles.length} failed</span>
                <span>{progressValue}%</span>
            </div>
        </div>

        <div class="overflow-hidden rounded-md border">
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head class="w-16">Preview</Table.Head>
                        <Table.Head>Filename</Table.Head>
                        <Table.Head class="w-28">Size</Table.Head>
                        <Table.Head class="w-32">Status</Table.Head>
                        <Table.Head class="w-16 text-right"></Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#if fileList.length === 0}
                        <Table.Row>
                            <Table.Cell
                                class="h-24 text-center text-muted-foreground"
                                colspan={5}
                            >
                                No files selected.
                            </Table.Cell>
                        </Table.Row>
                    {:else}
                        {#each fileList as file, index (file.hashSha256)}
                            <Table.Row>
                                <Table.Cell>
                                    <Avatar.Root class="size-10 rounded-md">
                                        {#if file.previewUrl}
                                            <Avatar.Image
                                                src={file.previewUrl}
                                                alt={file.file.name}
                                                class="rounded-md object-cover"
                                            />
                                        {/if}
                                        <Avatar.Fallback
                                            class="rounded-md bg-muted"
                                        >
                                            <FileIcon
                                                class="size-5 text-muted-foreground"
                                            />
                                        </Avatar.Fallback>
                                    </Avatar.Root>
                                </Table.Cell>
                                <Table.Cell>
                                    <div class="min-w-0">
                                        <p
                                            class="truncate font-medium"
                                            title={file.file.name}
                                        >
                                            {file.file.name}
                                        </p>
                                        <p
                                            class="truncate text-xs text-muted-foreground"
                                        >
                                            {file.mimeType}
                                        </p>
                                    </div>
                                </Table.Cell>
                                <Table.Cell class="text-muted-foreground">
                                    {formatBytes(file.file.size)}
                                </Table.Cell>
                                <Table.Cell>
                                    {#if file.status === 'UPLOADED'}
                                        <Badge class="bg-emerald-600">
                                            <CircleCheckIcon class="size-3.5" />
                                            Uploaded
                                        </Badge>
                                    {:else if file.status === 'FAILED'}
                                        <Badge variant="destructive">
                                            <CircleXIcon class="size-3.5" />
                                            Failed
                                        </Badge>
                                    {:else if file.status === 'UPLOADING'}
                                        <Badge variant="secondary">
                                            <LoaderCircleIcon
                                                class="size-3.5 animate-spin"
                                            />
                                            Uploading
                                        </Badge>
                                    {:else}
                                        <Badge variant="outline">Queued</Badge>
                                    {/if}
                                </Table.Cell>
                                <Table.Cell class="text-right">
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger>
                                            <Button
                                                disabled={disabled ||
                                                    isActionLocked ||
                                                    isCommitted}
                                                size="icon"
                                                variant="ghost"
                                            >
                                                <EllipsisVerticalIcon
                                                    class="size-4"
                                                />
                                            </Button>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Content align="end">
                                            {#if file.status === 'FAILED'}
                                                <DropdownMenu.Item
                                                    data-index={index}
                                                    disabled={disabled ||
                                                        isActionLocked ||
                                                        isCommitted}
                                                    onclick={handleFileRetrySelect}
                                                >
                                                    <RefreshCwIcon
                                                        class="size-4"
                                                    />
                                                    Retry
                                                </DropdownMenu.Item>
                                            {/if}
                                            <DropdownMenu.Item
                                                data-hash={file.hashSha256}
                                                disabled={disabled ||
                                                    isActionLocked ||
                                                    isCommitted}
                                                onclick={handleRemoveFileSelect}
                                                variant="destructive"
                                            >
                                                <Trash2Icon class="size-4" />
                                                Delete
                                            </DropdownMenu.Item>
                                        </DropdownMenu.Content>
                                    </DropdownMenu.Root>
                                </Table.Cell>
                            </Table.Row>
                        {/each}
                    {/if}
                </Table.Body>
            </Table.Root>
        </div>

        <input
            bind:this={fileInput}
            accept={acceptedMimeTypes}
            class="hidden"
            disabled={disabled || isActionLocked || isCommitted}
            multiple
            onchange={handleFileInputChange}
            type="file"
        />
    </Card.Content>
</Card.Root>
