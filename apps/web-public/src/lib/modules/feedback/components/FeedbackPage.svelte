<script lang="ts">
    import * as Card from '@cosina/ui/components/card'
    import { Button } from '@cosina/ui/components/button'
    import { Input } from '@cosina/ui/components/input'
    import { Skeleton } from '@cosina/ui/components/skeleton'
    import { Textarea } from '@cosina/ui/components/textarea'
    import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2'
    import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left'
    import ChevronRightIcon from '@lucide/svelte/icons/chevron-right'
    import ClockIcon from '@lucide/svelte/icons/clock'
    import MessageSquareOffIcon from '@lucide/svelte/icons/message-square-off'
    import StarIcon from '@lucide/svelte/icons/star'
    import XCircleIcon from '@lucide/svelte/icons/x-circle'
    import {
        createMutation,
        createQuery,
        useQueryClient,
    } from '@tanstack/svelte-query'
    import { tick, untrack } from 'svelte'
    import { toast } from 'svelte-sonner'

    import { PUBLIC_CF_TURNSTILE_SITE_KEY } from '$env/static/public'
    import { feedbackClient } from '$lib/clients'
    import CaptchaModal from '$lib/components/modal/CaptchaModal.svelte'
    import { useSessionContext } from '$lib/states/session'
    import { requestCaptchaToken } from '$lib/utilities/helpers'
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
    const PAGE_SIZE = 3

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()
    const queryClient = useQueryClient()

    let showForm = $state(true)
    let customerName = $state('')
    let rating = $state(0)
    let hoveredRating = $state(0)
    let comment = $state('')
    let showCaptchaModal = $state(false)
    let currentPage = $state(1)

    /////////////////
    // 04. Derived //
    /////////////////

    const activeStars = $derived(hoveredRating || rating)

    /////////////////
    // 05. Queries //
    /////////////////

    const myFeedbackQuery = createQuery(() => ({
        queryKey: [
            'feedback',
            'mine',
        ],
        queryFn: async () => {
            const response = await feedbackClient.readMine.$get({
                query: { sortOrder: 'desc' },
            })
            const json = await response.json()
            if (!json.success) throw new Error(json.error.message)
            return json.data as {
                publicId: string
                rating: number
                comment: string | null
                status: string
                createdAt: string
            }[]
        },
    }))

    ///////////////////
    // 06. Mutations //
    ///////////////////

    const submitMutation = createMutation(() => ({
        mutationKey: [
            'feedback',
            'create',
        ],
        mutationFn: async () => {
            showCaptchaModal = true
            await tick()

            const captchaToken = await requestCaptchaToken({
                action: 'feedback-create',
                siteKey: PUBLIC_CF_TURNSTILE_SITE_KEY,
                onCaptchaResolved: () => {
                    showCaptchaModal = false
                },
            })

            const response = await feedbackClient.create.$post(
                {
                    json: {
                        customerName: customerName.trim(),
                        rating,
                        comment: comment.trim() || undefined,
                    },
                },
                { headers: { 'x-captcha-response': captchaToken } },
            )
            const json = await response.json()
            if (!json.success) throw new Error(json.error.message)
            return json.data
        },
        onSuccess: () => {
            toast.success('Thank you!', {
                description: 'Your feedback has been submitted.',
            })
            rating = 0
            comment = ''
            showForm = false
            queryClient.invalidateQueries({
                queryKey: [
                    'feedback',
                    'mine',
                ],
            })
        },
        onError: (err: Error) => {
            showCaptchaModal = false
            toast.error('Failed to submit', { description: err.message })
        },
    }))

    const canSubmit = $derived(
        customerName.trim().length >= 2 &&
            rating > 0 &&
            !submitMutation.isPending,
    )

    // Pagination deriveds — depend on query data, so placed after queries
    const submissions = $derived(myFeedbackQuery.data ?? [])
    const totalPages = $derived(Math.ceil(submissions.length / PAGE_SIZE))
    const paginated = $derived(
        submissions.slice(
            (currentPage - 1) * PAGE_SIZE,
            currentPage * PAGE_SIZE,
        ),
    )

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        const name = session.data.name
        if (name && name !== '{{name}}' && !untrack(() => customerName)) {
            customerName = name
        }
    })

    $effect(() => {
        const ws = wsClientManager.connect('feedback')

        function handleMessage(event: MessageEvent) {
            try {
                const { event: eventType } = JSON.parse(event.data)
                if (eventType === 'feedback.statusUpdate') {
                    queryClient.invalidateQueries({
                        queryKey: [
                            'feedback',
                            'mine',
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
            .getElementById('submissions-top')
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function statusConfig(status: string) {
        if (status === 'published') {
            return {
                label: 'Published',
                icon: CheckCircle2Icon,
                class: 'text-emerald-600 bg-emerald-500/10 dark:text-emerald-400',
            }
        }
        if (status === 'rejected') {
            return {
                label: 'Not published',
                icon: XCircleIcon,
                class: 'text-red-600 bg-red-500/10 dark:text-red-400',
            }
        }
        return {
            label: 'Under review',
            icon: ClockIcon,
            class: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
        }
    }

    function formatDate(iso: string) {
        return new Date(iso).toLocaleDateString('en-PH', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }
</script>

<CaptchaModal open={showCaptchaModal} />

<div class="mx-auto flex max-w-xl flex-col gap-6">
    <!-- Submit form -->
    {#if showForm}
        <Card.Root>
            <Card.Header>
                <Card.Title>Share Your Feedback</Card.Title>
                <Card.Description>
                    Let us know how we're doing. Your feedback helps us improve.
                </Card.Description>
            </Card.Header>
            <Card.Content>
                <div class="flex flex-col gap-4">
                    <!-- Name -->
                    <div class="flex flex-col gap-1.5">
                        <label
                            for="feedback-name"
                            class="text-sm font-medium">Your name</label
                        >
                        <Input
                            id="feedback-name"
                            bind:value={customerName}
                            placeholder="e.g. Maria Santos"
                            maxlength={100}
                            autocomplete="name"
                            disabled={submitMutation.isPending}
                        />
                    </div>

                    <!-- Star Rating -->
                    <div class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">Rating</span>
                        <div class="flex gap-1">
                            {#each [1, 2, 3, 4, 5] as star (star)}
                                <button
                                    type="button"
                                    class="cursor-pointer transition-transform hover:scale-110 disabled:opacity-50"
                                    onmouseenter={() => (hoveredRating = star)}
                                    onmouseleave={() => (hoveredRating = 0)}
                                    onclick={() => (rating = star)}
                                    aria-label="Rate {star} star{star > 1
                                        ? 's'
                                        : ''}"
                                    disabled={submitMutation.isPending}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        class="size-8 text-muted-foreground/60 transition-colors"
                                        aria-hidden="true"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    >
                                        <polygon
                                            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                                            fill={activeStars >= star
                                                ? '#facc15'
                                                : 'none'}
                                            stroke={activeStars >= star
                                                ? '#facc15'
                                                : 'currentColor'}
                                        />
                                    </svg>
                                </button>
                            {/each}
                        </div>
                        {#if rating > 0}
                            <span class="text-xs text-muted-foreground">
                                {RATING_LABELS[rating]}
                            </span>
                        {/if}
                    </div>

                    <!-- Comment -->
                    <div class="flex flex-col gap-1.5">
                        <span class="text-sm font-medium">
                            Comment
                            <span class="font-normal text-muted-foreground"
                                >(optional)</span
                            >
                        </span>
                        <Textarea
                            bind:value={comment}
                            placeholder="Share your experience..."
                            maxlength={512}
                            rows={3}
                            disabled={submitMutation.isPending}
                        />
                        <span class="text-right text-xs text-muted-foreground"
                            >{comment.length}/512</span
                        >
                    </div>

                    <!-- Submit -->
                    <Button
                        onclick={() => submitMutation.mutate()}
                        disabled={!canSubmit}
                        class="self-start"
                    >
                        {submitMutation.isPending
                            ? 'Submitting...'
                            : 'Submit Feedback'}
                    </Button>
                </div>
            </Card.Content>
        </Card.Root>
    {/if}

    <!-- My submissions -->
    <div
        id="submissions-top"
        class="flex scroll-mt-4 flex-col gap-4"
    >
        <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold">My Submissions</h3>
            {#if !showForm}
                <button
                    type="button"
                    class="text-xs font-medium text-primary hover:underline"
                    onclick={() => (showForm = true)}
                >
                    Leave another review
                </button>
            {/if}
        </div>

        {#if myFeedbackQuery.isPending}
            {#each [0, 1, 2] as i (i)}
                <Skeleton class="h-28 rounded-xl" />
            {/each}
        {:else if submissions.length === 0}
            <div
                class="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12 text-center"
            >
                <MessageSquareOffIcon class="size-9 text-muted-foreground/40" />
                <p class="text-sm text-muted-foreground">
                    No feedback submitted yet.
                </p>
            </div>
        {:else}
            {#each paginated as row (row.publicId)}
                {@const status = statusConfig(row.status)}
                {@const StatusIcon = status.icon}
                <Card.Root class="transition-colors hover:border-border/80">
                    <Card.Content class="flex flex-col gap-3 p-4 sm:p-5">
                        <!-- Header row: stars + status badge -->
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex flex-col gap-1">
                                <div class="flex items-center gap-0.5">
                                    {#each [1, 2, 3, 4, 5] as star (star)}
                                        <StarIcon
                                            class="size-4 {row.rating >= star
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'fill-none text-muted-foreground/20'}"
                                        />
                                    {/each}
                                </div>
                                <span class="text-xs text-muted-foreground">
                                    {RATING_LABELS[row.rating]}
                                </span>
                            </div>

                            <!-- Status pill -->
                            <span
                                class="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold {status.class}"
                            >
                                <StatusIcon class="size-3" />
                                {status.label}
                            </span>
                        </div>

                        <!-- Comment -->
                        {#if row.comment}
                            <p
                                class="text-sm/relaxed text-foreground before:text-muted-foreground/40 before:content-['\201C'] after:text-muted-foreground/40 after:content-['\201D']"
                            >
                                {row.comment}
                            </p>
                        {:else}
                            <p class="text-sm italic text-muted-foreground/50">
                                No written comment provided.
                            </p>
                        {/if}

                        <!-- Date -->
                        <span class="text-xs text-muted-foreground/70">
                            {formatDate(row.createdAt)}
                        </span>
                    </Card.Content>
                </Card.Root>
            {/each}

            <!-- Pagination -->
            {#if totalPages > 1}
                <div class="flex items-center justify-center gap-3 pt-1">
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
                        class="min-w-24 text-center text-sm text-muted-foreground tabular-nums"
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
</div>
