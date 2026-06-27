<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import ImageIcon from '@lucide/svelte/icons/image'
    import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
    import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw'
    import Trash2Icon from '@lucide/svelte/icons/trash-2'
    import { onDestroy } from 'svelte'
    import { toast } from 'svelte-sonner'

    import { PUBLIC_API_URL } from '$env/static/public'
    import { getCookie, getCsrfCookieName } from '$lib/utilities/helpers'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        // eslint-disable-next-line no-useless-assignment
        objectStorageId = $bindable<string | null>(null),
        // eslint-disable-next-line no-useless-assignment
        isUploading = $bindable(false),
    }: {
        objectStorageId?: string | null
        isUploading?: boolean
    } = $props()

    ///////////////
    // 03. State //
    ///////////////

    type UploadStatus = 'idle' | 'uploading' | 'done' | 'failed'

    let status = $state<UploadStatus>('idle')
    let previewUrl = $state<string | null>(null)
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
        if (previewUrl) URL.revokeObjectURL(previewUrl)
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

        if (previewUrl) URL.revokeObjectURL(previewUrl)
        previewUrl = URL.createObjectURL(file)
        status = 'uploading'

        try {
            const formData = new FormData()
            formData.append('file', file)

            const csrfToken = getCookie(getCsrfCookieName(import.meta.env.MODE))

            const response = await fetch(
                `${PUBLIC_API_URL}/api/order/proof/upload`,
                {
                    method: 'POST',
                    body: formData,
                    credentials: 'include',
                    headers: csrfToken
                        ? { 'x-csrf-token': decodeURIComponent(csrfToken) }
                        : {},
                },
            )

            const json = (await response.json()) as {
                success: boolean
                data?: { objectStorageId: string }
                error?: { message: string }
            }

            if (!json.success) {
                throw new Error(json.error?.message ?? 'Upload failed.')
            }

            objectStorageId = json.data?.objectStorageId ?? null
            status = 'done'
        } catch (err) {
            status = 'failed'
            errorMessage = err instanceof Error ? err.message : 'Upload failed.'
            toast.error(errorMessage)
            if (previewUrl) URL.revokeObjectURL(previewUrl)
            previewUrl = null
            objectStorageId = null
        } finally {
            if (fileInputEl) fileInputEl.value = ''
        }
    }

    function removeImage() {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        previewUrl = null
        objectStorageId = null
        status = 'idle'
        errorMessage = null
        if (fileInputEl) fileInputEl.value = ''
    }
</script>

<div class="flex flex-col gap-1.5">
    <div
        class="relative w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900/50"
    >
        {#if previewUrl}
            <img
                src={previewUrl}
                alt="Payment proof"
                class="max-h-64 min-h-32 w-full object-contain"
            />

            <!-- Bottom overlay bar -->
            {#if !busy}
                <div
                    class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 px-2 py-1.5 backdrop-blur-sm"
                >
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="h-7 gap-1.5 px-2 text-xs text-zinc-200 hover:bg-white/20 hover:text-white"
                        onclick={() => fileInputEl?.click()}
                    >
                        <RotateCcwIcon class="size-3" />
                        Change
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="size-7  hover:bg-white/20"
                        onclick={removeImage}
                    >
                        <Trash2Icon class="size-3.5 text-zinc-200" />
                    </Button>
                </div>
            {/if}

            <!-- Upload spinner overlay -->
            {#if busy}
                <div
                    class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50"
                >
                    <LoaderCircleIcon class="size-6 animate-spin text-white" />
                    <span class="text-xs text-zinc-300">Uploading…</span>
                </div>
            {/if}
        {:else}
            <button
                type="button"
                class="flex w-full flex-col items-center justify-center gap-2 py-8 transition-colors hover:bg-zinc-800/50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy}
                onclick={() => fileInputEl?.click()}
            >
                {#if busy}
                    <LoaderCircleIcon
                        class="size-7 animate-spin text-zinc-500"
                    />
                    <span class="text-xs text-zinc-500">Uploading…</span>
                {:else}
                    <ImageIcon class="size-7 text-zinc-500" />
                    <span class="text-sm text-zinc-500"
                        >Click to upload screenshot</span
                    >
                {/if}
            </button>
        {/if}
    </div>

    {#if errorMessage}
        <p class="text-xs text-red-400">{errorMessage}</p>
    {:else}
        <p class="text-xs text-zinc-600">PNG, JPG or WEBP · max 10 MB</p>
    {/if}

    <input
        bind:this={fileInputEl}
        type="file"
        accept="image/*"
        class="hidden"
        onchange={handleFileSelect}
    />
</div>
