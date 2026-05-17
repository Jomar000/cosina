<script lang="ts">
    import * as Avatar from '@hyperion/ui/components/avatar'
    import { Badge } from '@hyperion/ui/components/badge'
    import { Button } from '@hyperion/ui/components/button'
    import * as Card from '@hyperion/ui/components/card'
    import * as DropdownMenu from '@hyperion/ui/components/dropdown-menu'
    import * as Table from '@hyperion/ui/components/table'
    import CircleCheck from '@lucide/svelte/icons/circle-check'
    import CircleX from '@lucide/svelte/icons/circle-x'
    import CloudUpload from '@lucide/svelte/icons/cloud-upload'
    import EllipsisVertical from '@lucide/svelte/icons/ellipsis-vertical'
    import FileIcon from '@lucide/svelte/icons/file'
    import RefreshCw from '@lucide/svelte/icons/refresh-cw'
    import Trash2 from '@lucide/svelte/icons/trash-2'
    import { fileTypeFromBuffer } from 'file-type'
    import ky from 'ky'
    import PQueue from 'p-queue'
    import { onMount } from 'svelte'

    import { objectStorageClient } from '$lib/clients'
    import { formatBytes, getCookie } from '$lib/utilities/helpers'

    ////////////////
    // Properties //
    ////////////////

    let {
        allowedMimeTypes = [],
        maxItems = 10,
        uploadId = $bindable(''),
    }: {
        allowedMimeTypes?: string[]
        maxItems?: number
        uploadId?: string
    } = $props()

    ////////////////////
    // Initialization //
    ////////////////////

    type Metadata = {
        file: File
        objectId: string
        isPublic: boolean
        mimeType: string
        hashSha256: string
        status: 'QUEUED' | 'UPLOADED' | 'FAILED'
    }

    let fileList: Metadata[] = $state([])
    let addedToList: Metadata[] = $state([])

    const uploadQueue = new PQueue({ concurrency: 3 })

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
    const opMode: 'NEW' | 'UPDATE' = uploadId === '' ? 'NEW' : 'UPDATE'

    //////////////
    // Handlers //
    //////////////

    const handleFileInputChange = async (event: Event) => {
        if (fileList.length >= maxItems) {
            // TODO: Add alert banner or modal here.
            alert('Maximum of 10 files only.')
            return
        }

        const selectedFiles = (event.target as HTMLInputElement)?.files
        addedToList = []

        if (selectedFiles) {
            if (selectedFiles.length > maxItems) {
                // TODO: Add alert banner or modal here.
                alert('Maximum of 10 files only.')
                return
            }

            /**
             * @description
             * STEP 1: Preprocessing of files to be signed
             */

            for (const file of Array.from(selectedFiles)) {
                const fileBuffer = await file.arrayBuffer()

                const mimeType =
                    (await fileTypeFromBuffer(fileBuffer))?.mime ??
                    'application/octet-stream'

                // Check if the detected MIME Type matches the allowed MIME types
                // Full matches & wildcard subtypes are supported
                const matchedMimeTypes = allowedMimeTypes.filter((amt) => {
                    return (
                        mimeType === amt ||
                        (amt.includes('*') &&
                            mimeType.startsWith(
                                amt.substring(0, amt.indexOf('*')),
                            ))
                    )
                })

                if (
                    allowedMimeTypes.length > 0 &&
                    matchedMimeTypes.length === 0
                ) {
                    // Skip invalid files
                    continue
                }

                // Compute SHA-256 checksum
                const hashBuffer = await crypto.subtle.digest(
                    'SHA-256',
                    fileBuffer,
                )

                const hashSha256 = Array.from(new Uint8Array(hashBuffer))
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('')

                if (
                    fileList.find((pf) => pf.hashSha256 === hashSha256) ||
                    addedToList.find((qf) => qf.hashSha256 === hashSha256)
                ) {
                    // Skip duplicate hashes
                    continue
                }

                addedToList = [
                    ...addedToList,
                    {
                        file,
                        objectId: '',
                        hashSha256,
                        isPublic: false,
                        mimeType,
                        status: 'QUEUED',
                    },
                ]
            }

            /**
             * @description
             * STEP 2: Signing Request
             */

            if (addedToList.length === 0) {
                return
            }

            // Update the table
            fileList = [
                ...fileList,
                ...addedToList,
            ]

            const signingResponse =
                await objectStorageClient.upload.attachment.create.$post(
                    {
                        json: {
                            uploadId,
                            attachments: addedToList.map((atl) => ({
                                size: atl.file.size as unknown as string,
                                hashSha256: atl.hashSha256,
                                isPublic: atl.isPublic,
                                mimeType: atl.mimeType,
                            })),
                        },
                    },
                    {
                        headers: {
                            'x-csrf-token': getCookie('csrf_token') ?? '',
                        },
                    },
                )

            const signingResponseData = await signingResponse.json()

            /**
             * @description
             * STEP 3: Upload
             */

            if (signingResponseData.success) {
                for (const su of signingResponseData.data.signedUrls) {
                    const queuedFn = async () => {
                        const hashIndex = addedToList.findIndex(
                            (q) => q.hashSha256 === su.hashSha256,
                        )

                        addedToList[hashIndex].objectId = su.id

                        if (su.status === 409) {
                            // File already exists, just set status to UPLOADED.
                            addedToList[hashIndex].status = 'UPLOADED'
                        } else {
                            try {
                                // Upload the file.
                                await ky(su.signedUrl!, {
                                    method: 'PUT',
                                    headers: {
                                        'x-amz-checksum-sha256':
                                            su.encodedHash!,
                                    },
                                    body: addedToList[hashIndex].file,
                                })

                                // Report back that file is successfully uploaded.
                                const commitResponse =
                                    await objectStorageClient.upload.attachment.commit.$post(
                                        {
                                            json: {
                                                uploadId,
                                                attachments: [su.id],
                                            },
                                        },
                                        {
                                            headers: {
                                                'x-csrf-token':
                                                    getCookie('csrf_token') ??
                                                    '',
                                            },
                                        },
                                    )

                                const commitResponseData =
                                    await commitResponse.json()

                                if (commitResponseData.success) {
                                    addedToList[hashIndex].status = 'UPLOADED'
                                }
                            } catch {
                                addedToList[hashIndex].status = 'FAILED'
                            }
                        }
                    }

                    uploadQueue.add(queuedFn).catch(() => {})
                }

                await uploadQueue.onIdle()
            }
        }
    }

    const handleFileRetry = async (index: number) => {
        const retryResponse =
            await objectStorageClient.upload.attachment.retry.$post(
                {
                    json: {
                        uploadId,
                        attachments: [fileList[index].objectId],
                    },
                },
                {
                    headers: {
                        'x-csrf-token': getCookie('csrf_token') ?? '',
                    },
                },
            )

        const retryResponseData = await retryResponse.json()

        if (retryResponseData.success) {
            for (const su of retryResponseData.data.signedUrls) {
                if (su.status === 409) {
                    // File already exists, just set status to UPLOADED.
                    fileList[index].status = 'UPLOADED'
                } else if (su.status === 200) {
                    try {
                        // Upload the file.
                        await ky(su.signedUrl!, {
                            method: 'PUT',
                            headers: {
                                'x-amz-checksum-sha256': su.encodedHash!,
                            },
                            body: fileList[index].file,
                        })

                        // Report back that file is successfully uploaded.
                        const commitResponse =
                            await objectStorageClient.upload.attachment.commit.$post(
                                {
                                    json: {
                                        uploadId,
                                        attachments: [fileList[index].objectId],
                                    },
                                },
                                {
                                    headers: {
                                        'x-csrf-token':
                                            getCookie('csrf_token') ?? '',
                                    },
                                },
                            )

                        const commitResponseData = await commitResponse.json()

                        if (commitResponseData.success) {
                            fileList[index].status = 'UPLOADED'
                        }
                    } catch {
                        fileList[index].status = 'FAILED'
                    }
                } else {
                    fileList[index].status = 'FAILED'
                }
            }
        }
    }

    ///////////////
    // Lifecycle //
    ///////////////

    onMount(async () => {
        if (opMode === 'NEW') {
            const response = await objectStorageClient.upload.create.$post()

            const responseData = await response.json()

            uploadId = responseData.data.uploadId
        } else {
            // TODO: Populate fileList with existing data
        }
    })
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
                    onclick={() => {
                        fileList = []
                    }}
                    variant="outline"
                >
                    <Trash2 class="mr-2 h-4 w-4" />
                    Clear All</Button
                >
                <Button
                    onclick={() =>
                        document.getElementById('fileInput')?.click()}
                >
                    <CloudUpload class="mr-2 h-4 w-4" />
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
                    {#each fileList as p, i (i)}
                        <Table.Row>
                            <Table.Cell>
                                <Avatar.Root class="h-10 w-10 rounded-md">
                                    {#if p.mimeType.startsWith('image/')}
                                        <Avatar.Image
                                            src={URL.createObjectURL(p.file)}
                                            alt={p.file.name}
                                            class="rounded-md object-cover"
                                        />
                                    {/if}
                                    <Avatar.Fallback
                                        class="rounded-md bg-muted"
                                    >
                                        <FileIcon
                                            class="h-5 w-5 text-muted-foreground"
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
                                        <CircleCheck
                                            class="mr-1.5 h-3.5 w-3.5"
                                        />
                                        UPLOADED
                                    </Badge>
                                {:else if p.status === 'FAILED'}
                                    <Badge variant="destructive">
                                        <CircleX class="mr-1.5 h-3.5 w-3.5" />
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
                                            <EllipsisVertical class="h-4 w-4" />
                                        </Button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Content>
                                        {#if p.status === 'FAILED'}
                                            <DropdownMenu.Item
                                                onclick={() =>
                                                    handleFileRetry(i)}
                                            >
                                                <RefreshCw
                                                    class="mr-2 h-4 w-4"
                                                />
                                                Retry
                                            </DropdownMenu.Item>
                                        {/if}
                                        <DropdownMenu.Item
                                            onclick={() => {
                                                fileList = fileList.filter(
                                                    (fl) =>
                                                        fl.hashSha256 !==
                                                        p.hashSha256,
                                                )
                                            }}
                                        >
                                            <Trash2 class="mr-2 h-4 w-4" />
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
