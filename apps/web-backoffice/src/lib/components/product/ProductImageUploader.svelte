<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import ImageIcon from '@lucide/svelte/icons/image'
    import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
    import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
    import Trash2Icon from '@lucide/svelte/icons/trash-2'
    import { onDestroy } from 'svelte'
    import { toast } from 'svelte-sonner'

    import { PUBLIC_API_URL } from '$env/static/public'
    import { getCookie } from '$lib/utilities/helpers'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        // eslint-disable-next-line no-useless-assignment
        objectStorageId = $bindable<string | null>(null),
        // eslint-disable-next-line no-useless-assignment
        isUploading = $bindable(false),
        initialImageUrl = null,
    }: {
        objectStorageId?: string | null
        isUploading?: boolean
        initialImageUrl?: string | null
    } = $props()

    ///////////////
    // 03. State //
    ///////////////

    type UploadStatus = 'idle' | 'uploading' | 'done' | 'failed'

    let status = $state<UploadStatus>('idle')
    let previewUrl = $state<string | null>(initialImageUrl ?? null)
    let fileInputEl = $state<HTMLInputElement | null>(null)
    let errorMessage = $state<string | null>(null)

    /////////////////
    // 04. Derived //
    /////////////////

    const busy = $derived(status === 'uploading')

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        isUploading = busy
    })

    onDestroy(() => {
        if (previewUrl && previewUrl !== initialImageUrl) {
            URL.revokeObjectURL(previewUrl)
        }
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    async function handleFileSelect(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return

        if (file.size > 10 * 1024 * 1024) {
            toast.error('Image must be 10 MB or less.')
            return
        }

        if (!file.type.startsWith('image/')) {
            toast.error('Only image files are supported.')
            return
        }

        errorMessage = null

        if (previewUrl && previewUrl !== initialImageUrl) {
            URL.revokeObjectURL(previewUrl)
        }
        previewUrl = URL.createObjectURL(file)
        status = 'uploading'

        try {
            const formData = new FormData()
            formData.append('file', file)

            const csrfToken = getCookie('csrf_token')

            const response = await fetch(
                `${PUBLIC_API_URL}/api/admin/product/image/upload`,
                {
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                    headers: csrfToken
                        ? { 'x-csrf-token': decodeURIComponent(csrfToken) }
                        : {},
                },
            )

            const json = await response.json()

            if (!json.success) {
                throw new Error(json.error?.message ?? 'Upload failed.')
            }

            objectStorageId = json.data.objectStorageId
            status = 'done'
        } catch (err) {
            status = 'failed'
            errorMessage = err instanceof Error ? err.message : 'Upload failed.'
            toast.error(errorMessage)
            if (previewUrl && previewUrl !== initialImageUrl) {
                URL.revokeObjectURL(previewUrl)
            }
            previewUrl = initialImageUrl ?? null
            objectStorageId = null
        } finally {
            if (fileInputEl) fileInputEl.value = ''
        }
    }

    function removeImage() {
        if (previewUrl && previewUrl !== initialImageUrl) {
            URL.revokeObjectURL(previewUrl)
        }
        previewUrl = null
        objectStorageId = null
        status = 'idle'
        errorMessage = null
        if (fileInputEl) fileInputEl.value = ''
    }
</script>

<div class="flex flex-col gap-1.5">
    <div
        class="bg-muted relative aspect-square w-full overflow-hidden rounded-lg border"
    >
        {#if previewUrl}
            <img
                src={previewUrl}
                alt="Product image"
                class="size-full object-cover"
            />

            <div
                class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/50 px-2 py-1"
            >
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    class="h-7 gap-1 px-2 text-xs text-white hover:bg-white/20 hover:text-white"
                    disabled={busy}
                    onclick={() => fileInputEl?.click()}
                >
                    <RotateCcwIcon class="size-3" />
                    Change
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 hover:bg-white/20"
                    disabled={busy}
                    onclick={removeImage}
                >
                    <Trash2Icon class="size-3.5 text-white" />
                </Button>
            </div>

            {#if busy}
                <div
                    class="absolute inset-0 flex items-center justify-center bg-black/40"
                >
                    <LoaderCircleIcon class="size-6 animate-spin text-white" />
                </div>
            {/if}
        {:else}
            <button
                type="button"
                class="flex size-full flex-col items-center justify-center gap-2 transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy}
                onclick={() => fileInputEl?.click()}
            >
                {#if busy}
                    <LoaderCircleIcon
                        class="text-muted-foreground size-7 animate-spin"
                    />
                    <span class="text-muted-foreground text-xs">Uploading…</span
                    >
                {:else}
                    <ImageIcon class="text-muted-foreground size-7" />
                    <span class="text-muted-foreground text-xs"
                        >Click to upload</span
                    >
                {/if}
            </button>
        {/if}
    </div>

    {#if errorMessage}
        <p class="text-destructive text-xs">{errorMessage}</p>
    {:else}
        <p class="text-muted-foreground text-xs">JPG, PNG, WEBP · max 10 MB</p>
    {/if}

    <input
        bind:this={fileInputEl}
        type="file"
        accept="image/*"
        class="hidden"
        onchange={handleFileSelect}
    />
</div>
