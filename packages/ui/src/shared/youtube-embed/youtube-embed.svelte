<script lang="ts">
    import PlayCircle from '@lucide/svelte/icons/play-circle'
    import { cn } from '$lib/utils.js'
    import { untrack, type Snippet } from 'svelte'

    interface Props {
        /** Full YouTube URL in any supported format (watch, youtu.be, shorts) */
        url: string
        /** iframe title attribute for accessibility */
        title: string
        /** YouTube thumbnail resolution. Use 'maxresdefault' for recent videos with HD thumbs */
        thumbnailQuality?: 'maxresdefault' | 'hqdefault'
        /** Enables the YouTube IFrame Player API (enablejsapi=1) */
        enablejsapi?: boolean
        /**
         * When true (default), shows the thumbnail first and embeds the iframe on click with autoplay.
         * When false, always renders the iframe directly (no thumbnail/play button).
         */
        lazy?: boolean
        /** Called when the user clicks the play button */
        onplay?: () => void
        /** Additional classes forwarded to the outer wrapper div */
        class?: string
        /**
         * Snippet rendered inside the wrapper only in thumbnail state.
         * Use for absolute-positioned overlays like tags or badges.
         */
        overlay?: Snippet
    }

    let {
        url,
        title,
        thumbnailQuality = 'hqdefault',
        enablejsapi = false,
        lazy = true,
        onplay,
        class: className,
        overlay,
    }: Props = $props()

    const getVideoId = (src: string): string | null => {
        if (!src) return null
        const match = src.match(
            /^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/,
        )
        return match && match[1].length === 11 ? match[1] : null
    }

    // untrack intentionally — we only want the initial value of `lazy`.
    // The component remounts (via parent {#key}) when the URL changes, resetting this.
    let isPlaying = $state(untrack(() => !lazy))
    let videoId = $derived(getVideoId(url))

    const buildSrc = (id: string): string => {
        const params: string[] = [
            'playsinline=1',
            'rel=0',
        ]
        if (lazy) params.unshift('autoplay=1')
        if (enablejsapi) params.push('enablejsapi=1')
        return `https://www.youtube.com/embed/${id}?${params.join('&')}`
    }
</script>

<div class={cn('group relative w-full overflow-hidden bg-black', className)}>
    {#if videoId}
        {#if isPlaying || !lazy}
            <iframe
                width="100%"
                height="100%"
                src={buildSrc(videoId)}
                {title}
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
                class="absolute inset-0 size-full animate-in duration-500 fade-in"
            ></iframe>
        {:else}
            <img
                loading="lazy"
                src="https://img.youtube.com/vi/{videoId}/{thumbnailQuality}.jpg"
                alt={title}
                class="size-full object-cover opacity-80 transition-opacity group-hover:opacity-60"
            />
            <div
                class="absolute inset-0 flex flex-col items-center justify-center"
            >
                <button
                    onclick={() => {
                        isPlaying = true
                        onplay?.()
                    }}
                    class="group/btn flex flex-col items-center gap-2 transition-transform hover:scale-110 active:scale-95"
                >
                    <PlayCircle
                        class="size-16 text-white opacity-90 transition-transform duration-200 group-hover/btn:scale-110"
                    />
                    <span
                        class="rounded bg-black/60 px-4 py-1.5 text-[10px] font-bold tracking-widest text-white uppercase backdrop-blur-sm sm:text-xs"
                    >
                        Watch Video
                    </span>
                </button>
            </div>
            {#if overlay}
                {@render overlay()}
            {/if}
        {/if}
    {:else}
        <div
            class="absolute inset-0 flex items-center justify-center text-white/60"
        >
            <p class="text-sm">Invalid video URL</p>
        </div>
    {/if}
</div>
