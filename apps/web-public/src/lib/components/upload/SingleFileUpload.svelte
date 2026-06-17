<script lang="ts">
    import * as Alert from '@hyperion/ui/components/alert'
    import * as Avatar from '@hyperion/ui/components/avatar'
    import { Badge } from '@hyperion/ui/components/badge'
    import { Button } from '@hyperion/ui/components/button'
    import * as Card from '@hyperion/ui/components/card'
    import { Progress } from '@hyperion/ui/components/progress'
    import { cn } from '@hyperion/ui/utils'
    import AlertCircleIcon from '@lucide/svelte/icons/alert-circle'
    import CheckCheckIcon from '@lucide/svelte/icons/check-check'
    import CircleCheckIcon from '@lucide/svelte/icons/circle-check'
    import CircleXIcon from '@lucide/svelte/icons/circle-x'
    import CloudUploadIcon from '@lucide/svelte/icons/cloud-upload'
    import FileIcon from '@lucide/svelte/icons/file'
    import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
    import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
    import Trash2Icon from '@lucide/svelte/icons/trash-2'
    import { createMutation } from '@tanstack/svelte-query'
    import { onDestroy } from 'svelte'
    import { toast } from 'svelte-sonner'
    import { v7 as uuidv7 } from 'uuid'

    import { formatBytes } from '$lib/utilities/helpers'
    import {
        commitUploadSession,
        createUploadId,
        prepareUploadFiles,
        retryUploadFile,
        revokePreviewUrls,
        uploadQueuedFiles,
        type UploadMetadata,
    } from './utilities/singleFileUpload'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        allowedMimeTypes = [],
        autoCommit = false,
        class: className = '',
        disabled = false,
        isCommitted = $bindable(false),
        isPublic = false,
        objectId = $bindable(''),
        onCommit,
        uploadId = $bindable(''),
    }: {
        allowedMimeTypes?: string[]
        autoCommit?: boolean
        class?: string
        disabled?: boolean
        isCommitted?: boolean
        isPublic?: boolean
        objectId?: string
        onCommit?: (data: { attachments: string[]; uploadId: string }) => void
        uploadId?: string
    } = $props()

    ///////////////
    // 03. State //
    ///////////////

    let createUploadIdempotencyKey = $state(uuidv7())
    let fileInput = $state<HTMLInputElement | null>(null)
    let selectedFile = $state<UploadMetadata | null>(null)
    let uploadMessage = $state('')
    let isActionLocked = $state(false)

    /////////////////
    // 04. Derived //
    /////////////////

    const acceptedMimeTypes = $derived(allowedMimeTypes.join(','))
    const progressValue = $derived(
        selectedFile?.status === 'UPLOADED' ? 100 : selectedFile ? 45 : 0,
    )
    const canCommit = $derived(
        !disabled &&
            !isActionLocked &&
            !isCommitted &&
            selectedFile?.status === 'UPLOADED' &&
            objectId !== '',
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

    onDestroy(() => {
        if (selectedFile) revokePreviewUrls([selectedFile])
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    async function handleCommitUpload() {
        if (!canCommit || !selectedFile) return

        isActionLocked = true
        uploadMessage = ''

        try {
            await commitCurrentFile(selectedFile)
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
                existingFiles: [],
                isPublic,
                maxItems: 1,
                selectedFiles,
            })

            const queuedFile = result.queuedFiles[0]
            if (!queuedFile) {
                uploadMessage = 'File could not be queued.'
                return
            }

            if (selectedFile) revokePreviewUrls([selectedFile])

            selectedFile = queuedFile
            objectId = ''

            const uploadFile = selectedFile

            await uploadQueuedFilesMutation.mutateAsync({
                onFileChange: refreshSelectedFile,
                queuedFiles: [uploadFile],
                uploadId,
            })

            selectedFile = { ...uploadFile }
            objectId = uploadFile.objectId

            if (uploadFile.status === 'FAILED') {
                uploadMessage = 'File failed to upload.'
                return
            }

            if (autoCommit) {
                await commitCurrentFile(uploadFile)
            }
        } catch (error) {
            uploadMessage = getErrorMessage(error)
        } finally {
            input.value = ''
            isActionLocked = false
        }
    }

    function handleOpenFileInput() {
        if (disabled || isActionLocked || isCommitted) return
        fileInput?.click()
    }

    async function handleRetryUpload() {
        if (disabled || isActionLocked || isCommitted || !selectedFile) return

        isActionLocked = true
        uploadMessage = ''

        try {
            await retryUploadFileMutation.mutateAsync({
                file: selectedFile,
                onFileChange: refreshSelectedFile,
                uploadId,
            })

            selectedFile = { ...selectedFile }
            objectId = selectedFile.objectId
        } catch (error) {
            uploadMessage = getErrorMessage(error)
        } finally {
            isActionLocked = false
        }
    }

    function handleRemoveFile() {
        if (disabled || isActionLocked || isCommitted) return

        if (selectedFile) revokePreviewUrls([selectedFile])
        selectedFile = null
        objectId = ''
        uploadMessage = ''
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    async function ensureUploadId() {
        if (uploadId !== '') return

        uploadId = await createUploadMutation.mutateAsync(
            createUploadIdempotencyKey,
        )
        createUploadIdempotencyKey = uuidv7()
    }

    async function commitCurrentFile(file: UploadMetadata) {
        const data = await commitUploadMutation.mutateAsync({
            uploadId,
            objectIds: [file.objectId],
        })

        isCommitted = true
        onCommit?.(data)
        toast.success('Upload committed')
    }

    function getErrorMessage(error: unknown) {
        if (error instanceof Error) return error.message
        return 'Upload action failed.'
    }

    function refreshSelectedFile(file: UploadMetadata) {
        selectedFile = { ...file }
        objectId = file.objectId
    }
</script>

<Card.Root class={cn('w-full max-w-xl rounded-lg', className)}>
    <Card.Header class="gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div class="min-w-0">
            <Card.Title>File upload</Card.Title>
            <Card.Description>
                {selectedFile?.file.name ?? 'No file selected'}
            </Card.Description>
        </div>
        <Button
            disabled={disabled || isActionLocked || isCommitted}
            onclick={handleOpenFileInput}
        >
            <CloudUploadIcon class="size-4" />
            Select
        </Button>
    </Card.Header>
    <Card.Content class="space-y-4">
        {#if uploadMessage}
            <Alert.Root variant="destructive">
                <AlertCircleIcon class="size-4" />
                <Alert.Title>Upload issue</Alert.Title>
                <Alert.Description>{uploadMessage}</Alert.Description>
            </Alert.Root>
        {/if}

        <div class="flex items-center gap-3 rounded-md border p-3">
            <Avatar.Root class="size-12 rounded-md">
                {#if selectedFile?.previewUrl}
                    <Avatar.Image
                        src={selectedFile.previewUrl}
                        alt={selectedFile.file.name}
                        class="rounded-md object-cover"
                    />
                {/if}
                <Avatar.Fallback class="rounded-md bg-muted">
                    <FileIcon class="size-5 text-muted-foreground" />
                </Avatar.Fallback>
            </Avatar.Root>
            <div class="min-w-0 flex-1">
                <p class="truncate font-medium">
                    {selectedFile?.file.name ?? 'No file'}
                </p>
                <p class="text-sm text-muted-foreground">
                    {selectedFile
                        ? `${formatBytes(selectedFile.file.size)} · ${selectedFile.mimeType}`
                        : 'Waiting for selection'}
                </p>
            </div>
            {#if selectedFile?.status === 'UPLOADED'}
                <Badge class="bg-emerald-600">
                    <CircleCheckIcon class="size-3.5" />
                    Uploaded
                </Badge>
            {:else if selectedFile?.status === 'FAILED'}
                <Badge variant="destructive">
                    <CircleXIcon class="size-3.5" />
                    Failed
                </Badge>
            {:else if selectedFile?.status === 'UPLOADING'}
                <Badge variant="secondary">
                    <LoaderCircleIcon class="size-3.5 animate-spin" />
                    Uploading
                </Badge>
            {:else if selectedFile}
                <Badge variant="outline">Queued</Badge>
            {/if}
        </div>

        <Progress value={progressValue} />

        <div class="flex flex-wrap justify-end gap-2">
            <Button
                disabled={disabled ||
                    isActionLocked ||
                    isCommitted ||
                    !selectedFile}
                onclick={handleRemoveFile}
                variant="outline"
            >
                <Trash2Icon class="size-4" />
                Clear
            </Button>
            <Button
                disabled={disabled ||
                    isActionLocked ||
                    isCommitted ||
                    selectedFile?.status !== 'FAILED'}
                onclick={handleRetryUpload}
                variant="outline"
            >
                <RefreshCwIcon class="size-4" />
                Retry
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

        <input
            bind:this={fileInput}
            accept={acceptedMimeTypes}
            class="hidden"
            disabled={disabled || isActionLocked || isCommitted}
            onchange={handleFileInputChange}
            type="file"
        />
    </Card.Content>
</Card.Root>
