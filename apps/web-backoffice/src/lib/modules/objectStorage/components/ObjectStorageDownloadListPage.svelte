<script lang="ts">
    import * as Alert from '@hyperion/ui/components/alert'
    import { Badge } from '@hyperion/ui/components/badge'
    import { Button } from '@hyperion/ui/components/button'
    import * as Card from '@hyperion/ui/components/card'
    import * as Table from '@hyperion/ui/components/table'
    import AlertCircleIcon from '@lucide/svelte/icons/alert-circle'
    import DownloadIcon from '@lucide/svelte/icons/download'
    import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
    import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw'
    import { createMutation, createQuery } from '@tanstack/svelte-query'
    import { toast } from 'svelte-sonner'

    import { objectStorageClient } from '$lib/clients'
    import { formatBytes } from '$lib/utilities/helpers'

    type DownloadObjectRow = {
        uploadId: string
        objectStorageId: string
        size: number
        mimeType: string | null
        hashSha256: string
        isPublic: boolean
        objectCreatedAt: string | Date
        uploadCreatedAt: string | Date
    }

    ///////////////
    // 03. State //
    ///////////////

    let limit = $state(25)
    let offset = $state(0)
    let selectedObjectStorageId = $state('')

    /////////////////
    // 04. Derived //
    /////////////////

    const files = $derived.by(
        () => (downloadListQuery.data?.data ?? []) as DownloadObjectRow[],
    )
    const hasPreviousPage = $derived(offset > 0)
    const hasNextPage = $derived.by(
        () =>
            Boolean(downloadListQuery.data?.count) &&
            offset + limit < (downloadListQuery.data?.count ?? 0),
    )

    /////////////////
    // 05. Queries //
    /////////////////

    const downloadListQuery = createQuery(() => ({
        queryKey: [
            'objectStorage',
            'download',
            'readMany',
            limit,
            offset,
        ],
        queryFn: async () => {
            const response = await objectStorageClient.download.readMany.$get({
                query: {
                    limit: String(limit),
                    offset: String(offset),
                    sortOrder: 'desc',
                },
            })
            const responseJson = await response.json()

            if (!responseJson.success) {
                throw new Error(responseJson.error.message)
            }

            return {
                data: responseJson.data,
                count: responseJson.count,
                limit: responseJson.limit,
                offset: responseJson.offset,
            }
        },
    }))

    ///////////////////
    // 06. Mutations //
    ///////////////////

    const downloadLinkMutation = createMutation(() => ({
        mutationKey: [
            'objectStorage',
            'download',
            'link',
            'create',
        ],
        mutationFn: createDownloadLink,
    }))

    //////////////////
    // 09. Handlers //
    //////////////////

    async function handleDownloadSelect(event: Event) {
        const objectStorageId = (event.currentTarget as HTMLElement).dataset
            .objectStorageId
        const file = files.find(
            (candidate) => candidate.objectStorageId === objectStorageId,
        )

        if (!file) return

        selectedObjectStorageId = file.objectStorageId

        try {
            const downloadUrl = await downloadLinkMutation.mutateAsync(file)
            window.open(downloadUrl, '_blank', 'noopener,noreferrer')
        } catch (error) {
            toast.error(getErrorMessage(error))
        } finally {
            selectedObjectStorageId = ''
        }
    }

    function handleNextPage() {
        if (!hasNextPage) return
        offset += limit
    }

    function handlePreviousPage() {
        if (!hasPreviousPage) return
        offset = Math.max(0, offset - limit)
    }

    function handleRefresh() {
        void downloadListQuery.refetch()
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    async function createDownloadLink(file: DownloadObjectRow) {
        const response = await objectStorageClient.download.link.create.$post({
            json: {
                uploadId: file.uploadId,
            },
        })
        const responseJson = await response.json()

        if (!responseJson.success) {
            throw new Error(responseJson.error.message)
        }

        const downloadData = responseJson.data.downloadUrls.find(
            (candidate) => candidate.objectStorageId === file.objectStorageId,
        )

        if (!downloadData?.downloadUrl) {
            throw new Error('Download link is not available.')
        }

        return downloadData.downloadUrl
    }

    function formatDate(date: string | Date) {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(date))
    }

    function getErrorMessage(error: unknown) {
        if (error instanceof Error) return error.message
        return 'Download action failed.'
    }
</script>

<div class="flex min-h-svh flex-col gap-6 p-4 md:p-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="space-y-1">
            <h1 class="text-2xl font-semibold tracking-normal">
                Object Storage Downloads
            </h1>
            <p class="text-sm text-muted-foreground">
                {downloadListQuery.data?.count ?? 0} uploaded objects
            </p>
        </div>
        <Button
            disabled={downloadListQuery.isFetching}
            onclick={handleRefresh}
            variant="outline"
        >
            <RefreshCwIcon
                class={downloadListQuery.isFetching
                    ? 'size-4 animate-spin'
                    : 'size-4'}
            />
            Refresh
        </Button>
    </header>

    {#if downloadListQuery.isError}
        <Alert.Root variant="destructive">
            <AlertCircleIcon class="size-4" />
            <Alert.Title>Download list unavailable</Alert.Title>
            <Alert.Description>
                {getErrorMessage(downloadListQuery.error)}
            </Alert.Description>
        </Alert.Root>
    {/if}

    <Card.Root class="rounded-lg">
        <Card.Content class="p-0">
            <div class="overflow-hidden rounded-lg border">
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.Head>Object</Table.Head>
                            <Table.Head class="w-32">Access</Table.Head>
                            <Table.Head class="w-28">Size</Table.Head>
                            <Table.Head class="w-44">Uploaded</Table.Head>
                            <Table.Head class="w-20 text-right"></Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#if downloadListQuery.isPending}
                            <Table.Row>
                                <Table.Cell
                                    class="h-24 text-center text-muted-foreground"
                                    colspan={5}
                                >
                                    Loading objects.
                                </Table.Cell>
                            </Table.Row>
                        {:else if files.length === 0}
                            <Table.Row>
                                <Table.Cell
                                    class="h-24 text-center text-muted-foreground"
                                    colspan={5}
                                >
                                    No uploaded objects.
                                </Table.Cell>
                            </Table.Row>
                        {:else}
                            {#each files as file (file.uploadId + file.objectStorageId)}
                                <Table.Row>
                                    <Table.Cell>
                                        <div class="min-w-0">
                                            <p
                                                class="truncate font-medium"
                                                title={file.objectStorageId}
                                            >
                                                {file.objectStorageId}
                                            </p>
                                            <p
                                                class="truncate text-xs text-muted-foreground"
                                                title={file.hashSha256}
                                            >
                                                {file.mimeType ??
                                                    'application/octet-stream'}
                                                · {file.hashSha256}
                                            </p>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell>
                                        {#if file.isPublic}
                                            <Badge>Public</Badge>
                                        {:else}
                                            <Badge variant="secondary">
                                                Private
                                            </Badge>
                                        {/if}
                                    </Table.Cell>
                                    <Table.Cell class="text-muted-foreground">
                                        {formatBytes(file.size)}
                                    </Table.Cell>
                                    <Table.Cell class="text-muted-foreground">
                                        {formatDate(file.uploadCreatedAt)}
                                    </Table.Cell>
                                    <Table.Cell class="text-right">
                                        <Button
                                            data-object-storage-id={file.objectStorageId}
                                            disabled={downloadLinkMutation.isPending &&
                                                selectedObjectStorageId ===
                                                    file.objectStorageId}
                                            onclick={handleDownloadSelect}
                                            size="icon"
                                            variant="ghost"
                                        >
                                            {#if downloadLinkMutation.isPending && selectedObjectStorageId === file.objectStorageId}
                                                <LoaderCircleIcon
                                                    class="size-4 animate-spin"
                                                />
                                            {:else}
                                                <DownloadIcon class="size-4" />
                                            {/if}
                                        </Button>
                                    </Table.Cell>
                                </Table.Row>
                            {/each}
                        {/if}
                    </Table.Body>
                </Table.Root>
            </div>
        </Card.Content>
    </Card.Root>

    <div class="flex items-center justify-end gap-2">
        <Button
            disabled={!hasPreviousPage || downloadListQuery.isFetching}
            onclick={handlePreviousPage}
            variant="outline"
        >
            Previous
        </Button>
        <Button
            disabled={!hasNextPage || downloadListQuery.isFetching}
            onclick={handleNextPage}
            variant="outline"
        >
            Next
        </Button>
    </div>
</div>
