<script lang="ts">
    import * as Card from '@cosina/ui/components/card'
    import { Button } from '@cosina/ui/components/button'
    import { Skeleton } from '@cosina/ui/components/skeleton'
    import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
    import MessageSquareOffIcon from '@lucide/svelte/icons/message-square-off'
    import StarIcon from '@lucide/svelte/icons/star'
    import { createQuery, useQueryClient } from '@tanstack/svelte-query'

    import { feedbackClient } from '$lib/clients'
    import { wsClientManager } from '$lib/utilities/wsClientManager'

    ///////////////////
    // 02. Constants //
    ///////////////////

    const RATING_LABELS = [
        '',
        'Poor',
        'Fair',
        'Good',
        'Great',
        'Excellent',
    ]
    const PAGE_SIZE = 6

    const AVATAR_PALETTE = [
        'bg-blue-500/15 text-blue-600 dark:text-blue-400',
        'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        'bg-violet-500/15 text-violet-600 dark:text-violet-400',
        'bg-amber-500/15 text-amber-600 dark:text-amber-400',
        'bg-rose-500/15 text-rose-600 dark:text-rose-400',
        'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
    ]

    ///////////////
    // 03. State //
    ///////////////

    const queryClient = useQueryClient()
    let currentPage = $state(1)

    /////////////////
    // 05. Queries //
    /////////////////

    const testimonialsQuery = createQuery(() => ({
        queryKey: [
            'feedback',
            'published',
        ],
        queryFn: async () => {
            const response = await feedbackClient.readMany.$get({
                query: { sortOrder: 'desc', limit: '60' },
            })
            const json = await response.json()
            if (!json.success) throw new Error(json.error.message)
            return json.data as {
                publicId: string
                rating: number
                comment: string | null
                createdAt: string
                userName: string
            }[]
        },
    }))

    /////////////////
    // 04. Derived //
    /////////////////

    const reviews = $derived(testimonialsQuery.data ?? [])
    const totalPages = $derived(Math.ceil(reviews.length / PAGE_SIZE))
    const paginated = $derived(
        reviews.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    )
    const avgRating = $derived(
        reviews.length > 0
            ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            : 0,
    )

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        const ws = wsClientManager.connect('feedback')

        function handleMessage(event: MessageEvent) {
            try {
                const { event: eventType } = JSON.parse(event.data)
                if (eventType === 'feedback.statusUpdate') {
                    queryClient.invalidateQueries({
                        queryKey: [
                            'feedback',
                            'published',
                        ],
                    })
                }
            } catch {
                // ignore malformed messages
            }
        }

        ws.addEventListener('message', handleMessage)
        return () => {
            ws.removeEventListener('message', handleMessage)
            ws.release()
        }
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    function handlePageChange(page: number) {
        currentPage = Math.max(1, Math.min(page, totalPages))
        document
            .getElementById('reviews-top')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function avatarColor(name: string) {
        return AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length]
    }

    function formatDate(iso: string) {
        return new Date(iso).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
        })
    }
</script>

<div class="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-8">
    <!-- Page header -->
    <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-bold tracking-tight">
            What Our Customers Say
        </h1>

        {#if !testimonialsQuery.isPending && reviews.length > 0}
            <div class="flex flex-wrap items-center gap-2">
                <!-- Fractional average rating stars -->
                <div class="flex gap-0.5">
                    {#each [1, 2, 3, 4, 5] as s (s)}
                        <div class="relative size-4">
                            <StarIcon
                                class="absolute size-4 fill-none text-muted-foreground/30"
                            />
                            {#if avgRating >= s}
                                <StarIcon
                                    class="absolute size-4 fill-yellow-400 text-yellow-400"
                                />
                            {:else if avgRating >= s - 0.5}
                                <div
                                    class="absolute inset-0 overflow-hidden"
                                    style="width: 50%"
                                >
                                    <StarIcon
                                        class="size-4 fill-yellow-400 text-yellow-400"
                                    />
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
                <span class="text-sm font-semibold">{avgRating.toFixed(1)}</span
                >
                <span class="text-muted-foreground text-sm">·</span>
                <span class="text-muted-foreground text-sm">
                    {reviews.length} verified review{reviews.length === 1
                        ? ''
                        : 's'}
                </span>
            </div>
        {:else if !testimonialsQuery.isPending}
            <p class="text-muted-foreground text-sm">
                Real reviews from real customers.
            </p>
        {/if}
    </div>

    <!-- Skeleton loading -->
    {#if testimonialsQuery.isPending}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each [0, 1, 2, 3, 4, 5] as i (i)}
                <Skeleton class="h-44 rounded-xl" />
            {/each}
        </div>

        <!-- Empty state -->
    {:else if reviews.length === 0}
        <div
            class="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center"
        >
            <MessageSquareOffIcon class="text-muted-foreground/40 size-10" />
            <p class="text-muted-foreground text-sm">
                No reviews yet. Be the first to share your experience!
            </p>
        </div>

        <!-- Review grid -->
    {:else}
        <div
            id="reviews-top"
            class="grid scroll-mt-4 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
            {#each paginated as review (review.publicId)}
                <Card.Root
                    class="group flex flex-col overflow-hidden transition-colors hover:border-border/80"
                >
                    <Card.Content class="flex flex-1 flex-col gap-3 p-5">
                        <!-- Stars + rating label -->
                        <div class="flex items-center gap-2">
                            <div class="flex gap-0.5">
                                {#each [1, 2, 3, 4, 5] as s (s)}
                                    <StarIcon
                                        class="size-3.5 {review.rating >= s
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'fill-none text-muted-foreground/25'}"
                                    />
                                {/each}
                            </div>
                            <span
                                class="text-muted-foreground text-xs font-medium"
                            >
                                {RATING_LABELS[review.rating]}
                            </span>
                        </div>

                        <!-- Comment -->
                        {#if review.comment}
                            <p
                                class="text-foreground line-clamp-4 flex-1 text-sm/relaxed before:text-muted-foreground/40 before:content-['\201C'] after:text-muted-foreground/40 after:content-['\201D']"
                            >
                                {review.comment}
                            </p>
                        {:else}
                            <p
                                class="text-muted-foreground/50 flex-1 text-sm italic"
                            >
                                No written review.
                            </p>
                        {/if}
                    </Card.Content>

                    <!-- Author footer -->
                    <div class="flex items-center gap-3 border-t px-5 py-3">
                        <div
                            class="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold {avatarColor(
                                review.userName,
                            )}"
                        >
                            {review.userName.charAt(0).toUpperCase()}
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-medium">
                                {review.userName}
                            </p>
                            <p class="text-muted-foreground text-xs">
                                {formatDate(review.createdAt)}
                            </p>
                        </div>
                    </div>
                </Card.Root>
            {/each}
        </div>

        <!-- Pagination -->
        {#if totalPages > 1}
            <div class="flex items-center justify-center gap-3 pt-2">
                <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === 1}
                    onclick={() => handlePageChange(currentPage - 1)}
                    aria-label="Previous page"
                >
                    <ChevronLeftIcon class="size-4" />
                </Button>

                <span
                    class="text-muted-foreground min-w-24 text-center text-sm tabular-nums"
                >
                    Page {currentPage} of {totalPages}
                </span>

                <Button
                    variant="outline"
                    size="icon"
                    disabled={currentPage === totalPages}
                    onclick={() => handlePageChange(currentPage + 1)}
                    aria-label="Next page"
                >
                    <ChevronRightIcon class="size-4" />
                </Button>
            </div>
        {/if}
    {/if}
</div>
