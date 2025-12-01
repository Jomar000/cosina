<script lang="ts">
    import {
        CircleCheck,
        CircleX,
        CloudUpload,
        EllipsisVertical,
        File as FileIcon,
        RefreshCw,
        Trash2,
    } from '@lucide/svelte/icons'
    import { fileTypeFromBuffer } from 'file-type'
    import ky from 'ky'
    import PQueue from 'p-queue'
    import { onMount } from 'svelte'
    import { SvelteMap } from 'svelte/reactivity'

    import * as Avatar from '$lib/components/shadcn/avatar'
    import { Badge } from '$lib/components/shadcn/badge'
    import { Button } from '$lib/components/shadcn/button'
    import * as Card from '$lib/components/shadcn/card'
    import * as DropdownMenu from '$lib/components/shadcn/dropdown-menu'
    import * as Table from '$lib/components/shadcn/table'
    import { getCookie, honoClient } from '$lib/utilities'

    ////////////////
    // Properties //
    ////////////////

    let {
        allowedMimeTypes = [],
        uploadId = $bindable(''),
    }: {
        allowedMimeTypes?: string[]
        uploadId?: string
    } = $props()

    ////////////////////
    // Initialization //
    ////////////////////

    type Metadata = {
        file: File
        isPublic: boolean
        mimeType: string
        hashSha256: string
        status: 'QUEUED' | 'SUCCESS' | 'FAILED'
    }

    let fileList: Metadata[] = $state([])
    let addedToList: Metadata[] = $state([])

    const uploadQueue = new PQueue({ concurrency: 3 })

    //////////////
    // Handlers //
    //////////////

    const handleFileChange = async (event: Event) => {
        const selectedFiles = (event.target as HTMLInputElement)?.files
        const lookup: Map<string, File> = new SvelteMap()
        addedToList = []

        if (selectedFiles) {
            /**
             * @description
             * STEP 1: Preprocessing of files to be signed
             */

            for (const [
                _index,
                file,
            ] of Array.from(selectedFiles).entries()) {
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

                // Used to match Signed URLs
                lookup.set(hashSha256, file)

                addedToList = [
                    ...addedToList,
                    {
                        file,
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
                await honoClient.internal.objectStorage.upload.attachment.create.$post(
                    {
                        json: {
                            uploadId,
                            attachments: addedToList.map((qf) => ({
                                size: qf.file.size as unknown as string, // TODO: Fix vNumeric
                                hashSha256: qf.hashSha256,
                                isPublic: qf.isPublic,
                                mimeType: qf.mimeType,
                            })),
                        },
                    },
                    {
                        headers: {
                            'x-csrf-token': getCookie('csrf_token') ?? '',
                        },
                    },
                )

            /**
             * @description
             * STEP 3: Upload
             */

            if (signingResponse.ok) {
                const { data } = await signingResponse.json()

                for (const su of data.signedUrls) {
                    const queuedFn = async () => {
                        const currentIndex = addedToList.findIndex(
                            (q) => q.hashSha256 === su.hashSha256,
                        )

                        if (su.status === 409) {
                            // File already exists, just set status to SUCCESS.
                            addedToList[currentIndex].status = 'SUCCESS'
                        } else {
                            try {
                                // Upload the file.
                                await ky(su.signedUrl!, {
                                    method: 'PUT',
                                    headers: {
                                        'x-amz-checksum-sha256':
                                            su.encodedHash!,
                                    },
                                    body: lookup.get(su.hashSha256)!,
                                })

                                // Report back that file is successfully uploaded.
                                const commitResponse =
                                    await honoClient.internal.objectStorage.upload.attachment.commit.$post(
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

                                if (commitResponse.ok) {
                                    addedToList[currentIndex].status = 'SUCCESS'
                                }
                            } catch {
                                addedToList[currentIndex].status = 'FAILED'
                            }
                        }
                    }

                    uploadQueue.add(queuedFn).catch(() => {})
                }

                await uploadQueue.onIdle()
            }
        }
    }

    ///////////////
    // Lifecycle //
    ///////////////

    onMount(async () => {
        if (uploadId === '') {
            // No uploadId provided, process is new upload.
            const response =
                await honoClient.internal.objectStorage.upload.create.$get()
            const { data } = await response.json()
            uploadId = data.uploadId
        } else {
            // Retrieve uploadId and display contents.
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
                <Button variant="outline">
                    <Trash2 class="mr-2 h-4 w-4" />
                    Clear All</Button
                >
                <Button
                    onclick={() =>
                        document.getElementById('fileInput')!.click()}
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
                        <Table.Head class="w-[120px]">Size</Table.Head>
                        <Table.Head class="w-[150px]">Status</Table.Head>
                        <Table.Head class="w-[100px] text-right"
                            >Actions</Table.Head
                        >
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
                                >{p.file.size}</Table.Cell
                            >
                            <Table.Cell>
                                {#if p.status === 'SUCCESS'}
                                    <Badge
                                        variant="default"
                                        class="bg-green-500 hover:bg-green-600"
                                    >
                                        <CircleCheck
                                            class="mr-1.5 h-3.5 w-3.5"
                                        />
                                        Success
                                    </Badge>
                                {:else if p.status === 'FAILED'}
                                    <Badge variant="destructive">
                                        <CircleX class="mr-1.5 h-3.5 w-3.5" />
                                        Error
                                    </Badge>
                                {:else}
                                    <Badge variant="outline">Pending</Badge>
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
                                            <DropdownMenu.Item>
                                                <RefreshCw
                                                    class="mr-2 h-4 w-4"
                                                />
                                                Retry
                                            </DropdownMenu.Item>
                                        {/if}
                                        <DropdownMenu.Item>
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
                onchange={handleFileChange}
                type="file"
            />
        </Card.Content>
    </Card.Root>
</div>
