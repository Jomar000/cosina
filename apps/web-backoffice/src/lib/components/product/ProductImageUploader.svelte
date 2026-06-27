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
    // undefined = no user selection yet (falls through to initialImageUrl); null = user explicitly removed
    let localPreviewUrl = $state<string | null | undefined>(undefined)
    let fileInputEl = $state<HTMLInputElement | null>(null)
    let errorMessage = $state<string | null>(null)

    /////////////////
    // 04. Derived //
    /////////////////

    const busy = $derived(status === 'uploading')
    const previewUrl = $derived<string | null>(
        localPreviewUrl !== undefined
            ? localPreviewUrl
            : (initialImageUrl ?? null),
    )

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
        localPreviewUrl = URL.createObjectURL(file)
        status = 'uploading'

        try {
            const formData = new FormData()
            formData.append('file', file)

            const csrfToken = getCookie(getCsrfCookieName(import.meta.env.MODE))

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
            localPreviewUrl = undefined
            objectStorageId = null
        } finally {
            if (fileInputEl) fileInputEl.value = ''
        }
    }

    function removeImage() {
        if (previewUrl && previewUrl !== initialImageUrl) {
            URL.revokeObjectURL(previewUrl)
        }
        localPreviewUrl = null
        objectStorageId = null
        status = 'idle'
        errorMessage = null
        if (fileInputEl) fileInputEl.value = ''
    }
</script>

<div class="flex flex-col gap-1.5">
    <!-- 4:3 matches the product card display ratio -->
    <div
        class="relative aspect-4/3 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900"
    >
        {#if previewUrl}
            <!-- object-contain so the entire image is always visible -->
            <img
                src={previewUrl}
                alt="Product preview"
                class="size-full object-contain"
            />

            <!-- overlay controls — only visible when not uploading -->
            {#if !busy}
                <div
                    class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-linear-to-t from-black/70 to-transparent px-2 pb-2 pt-6"
                >
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="h-7 gap-1 px-2 text-xs text-white hover:bg-white/20 hover:text-white"
                        onclick={() => fileInputEl?.click()}
                    >
                        <RotateCcwIcon class="size-3" />
                        Change
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        class="size-7 hover:bg-white/20"
                        onclick={removeImage}
                    >
                        <Trash2Icon class="size-3.5 text-white" />
                    </Button>
                </div>
            {/if}

            {#if busy}
                <div
                    class="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50"
                >
                    <LoaderCircleIcon class="size-6 animate-spin text-white" />
                    <span class="text-xs font-medium text-white"
                        >Uploading…</span
                    >
                </div>
            {/if}
        {:else}
            <!--
                <label> associates natively with the sr-only input below via `for`,
                so the browser handles the tap without any programmatic .click().
                This eliminates the iOS scroll-to-top caused by focusing a display:none input.
            -->
            <label
                for="pf-img-input"
                class="group flex size-full cursor-pointer flex-col items-center justify-center gap-2.5 transition-colors hover:bg-zinc-800 {busy
                    ? 'pointer-events-none opacity-50'
                    : ''}"
            >
                {#if busy}
                    <LoaderCircleIcon
                        class="size-8 animate-spin text-zinc-500"
                    />
                    <span class="text-xs text-zinc-500">Uploading…</span>
                {:else}
                    <div
                        class="flex size-14 items-center justify-center rounded-full border border-dashed border-zinc-600 bg-zinc-800 transition-colors group-hover:border-zinc-500 group-hover:bg-zinc-700"
                    >
                        <ImageIcon
                            class="size-6 text-zinc-500 transition-colors group-hover:text-zinc-400"
                        />
                    </div>
                    <div class="text-center">
                        <p
                            class="text-xs font-medium text-zinc-400 group-hover:text-zinc-300"
                        >
                            Tap to upload photo
                        </p>
                        <p class="mt-0.5 text-[11px] text-zinc-600">
                            JPG, PNG, WEBP · max 10 MB
                        </p>
                    </div>
                {/if}
            </label>
        {/if}

        <!--
            Always in the DOM so fileInputEl ref is always valid (needed by the
            "Change" button). sr-only positions it absolutely at (0,0) of this
            .relative div — always on-screen when the image box is visible, so
            the browser never needs to scroll to bring it into view.
        -->
        <input
            id="pf-img-input"
            bind:this={fileInputEl}
            type="file"
            accept="image/*"
            class="sr-only"
            disabled={busy}
            onchange={handleFileSelect}
        />
    </div>

    {#if errorMessage}
        <p class="text-destructive text-xs">{errorMessage}</p>
    {/if}
</div>
