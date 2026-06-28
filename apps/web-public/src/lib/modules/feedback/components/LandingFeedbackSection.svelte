<script lang="ts">
    import ArrowRightIcon from '@lucide/svelte/icons/arrow-right'
    import SendIcon from '@lucide/svelte/icons/send'
    import StarIcon from '@lucide/svelte/icons/star'
    import {
        createMutation,
        createQuery,
        useQueryClient,
    } from '@tanstack/svelte-query'
    import { animate, inView, stagger } from 'motion'
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

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()
    const queryClient = useQueryClient()

    let customerName = $state('')
    let rating = $state(0)
    let hoveredRating = $state(0)
    let comment = $state('')
    let showCaptchaModal = $state(false)
    let submitted = $state(false)
    let submittedRating = $state(0)

    /////////////////
    // 04. Derived //
    /////////////////

    const activeStars = $derived(hoveredRating || rating)
    const canSubmit = $derived(
        customerName.trim().length >= 2 && rating > 0 && !submitted,
    )

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
                query: { sortOrder: 'desc', limit: '12' },
            })
            const responseJson = await response.json()
            if (!responseJson.success)
                throw new Error(responseJson.error.message)
            return responseJson.data as {
                publicId: string
                rating: number
                comment: string | null
                createdAt: string
                userName: string
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
            const responseJson = await response.json()
            if (!responseJson.success)
                throw new Error(responseJson.error.message)
            return responseJson.data
        },
        onSuccess: () => {
            submittedRating = rating
            submitted = true
            rating = 0
            comment = ''
            customerName = ''
            toast.success('Thank you for your feedback!')
            queryClient.invalidateQueries({
                queryKey: [
                    'feedback',
                    'mine',
                ],
            })
        },
        onError: (err: Error) => {
            showCaptchaModal = false
            toast.error('Could not submit feedback', {
                description: err.message,
            })
        },
    }))

    /////////////////
    // 08. Effects //
    /////////////////

    // Pre-fill name from session for logged-in users.
    // Reads session.data directly (no side-effect writes) to avoid the infinite
    // loop caused by isValid() calling clear() which mutates $state and re-triggers
    // this effect. untrack on customerName prevents the write from re-running it.
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
                            'published',
                        ],
                    })
                }
            } catch {
                /* ignore */
            }
        }

        ws.addEventListener('message', handleMessage)
        return () => {
            ws.removeEventListener('message', handleMessage)
            ws.release()
        }
    })

    $effect(() => {
        const reviews = testimonialsQuery.data ?? []
        if (reviews.length === 0) return

        return inView(
            '.feedback-grid',
            (el) => {
                animate(
                    el.querySelectorAll('.feedback-card'),
                    {
                        opacity: [
                            0,
                            1,
                        ],
                        transform: [
                            'translateY(36px)',
                            'translateY(0)',
                        ],
                    },
                    { duration: 0.48, delay: stagger(0.09) },
                )
            },
            { amount: 0.05 },
        )
    })

    /////////////////
    // 10. Helpers //
    /////////////////

    function formatMonth(iso: string) {
        return new Date(iso).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'short',
        })
    }

    function average(items: { rating: number }[]) {
        if (items.length === 0) return 0
        return items.reduce((s, i) => s + i.rating, 0) / items.length
    }

    const reviews = $derived(testimonialsQuery.data ?? [])
    const avgRating = $derived(average(reviews))
    const displayedReviews = $derived(reviews.slice(0, 6))
</script>

<CaptchaModal open={showCaptchaModal} />

<!-- ===== FEEDBACK / TESTIMONIALS SECTION ===== -->
<section class="relative overflow-hidden py-24">
    <!-- Ambient glow -->
    <div
        class="pointer-events-none absolute -top-32 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-blue-600/6 blur-3xl"
        aria-hidden="true"
    ></div>

    <div class="mx-auto max-w-6xl px-4 sm:px-6">
        <!-- Section Header -->
        <div class="mb-14 text-center">
            <p
                class="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400"
            >
                Customer Reviews
            </p>
            <h2
                class="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl"
            >
                What Our Customers Say
            </h2>

            {#if reviews.length > 0}
                <div class="mt-4 flex items-center justify-center gap-3">
                    <div class="flex gap-0.5">
                        {#each [1, 2, 3, 4, 5] as s (s)}
                            {@const fill =
                                avgRating >= s
                                    ? 1
                                    : avgRating >= s - 0.5
                                      ? 0.5
                                      : 0}
                            <div class="relative size-5">
                                <StarIcon
                                    class="absolute size-5 text-zinc-700"
                                />
                                {#if fill > 0}
                                    <div
                                        class="absolute inset-0 overflow-hidden"
                                        style="width: {fill * 100}%"
                                    >
                                        <StarIcon
                                            class="size-5 fill-yellow-400 text-yellow-400"
                                        />
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                    <span class="text-base font-semibold text-zinc-100"
                        >{avgRating.toFixed(1)}</span
                    >
                    <span class="text-sm text-zinc-500"
                        >· {reviews.length} review{reviews.length === 1
                            ? ''
                            : 's'}</span
                    >
                </div>
            {:else if !testimonialsQuery.isPending}
                <p class="mt-3 text-sm text-zinc-500">
                    Be the first to share your experience!
                </p>
            {/if}
        </div>

        <!-- Two-column layout: testimonials + submit form -->
        <div class="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
            <!-- ── Testimonials Grid ── -->
            <div class="flex-1 min-w-0">
                {#if testimonialsQuery.isPending}
                    <div
                        class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {#each [0, 1, 2, 3, 4, 5] as i (i)}
                            <div
                                class="h-44 animate-pulse rounded-2xl bg-zinc-800/60"
                            ></div>
                        {/each}
                    </div>
                {:else if displayedReviews.length === 0}
                    <div
                        class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 text-center"
                    >
                        <div class="mb-3 flex gap-0.5">
                            {#each [1, 2, 3, 4, 5] as s (s)}
                                <StarIcon class="size-6 text-zinc-700" />
                            {/each}
                        </div>
                        <p class="text-sm text-zinc-500">
                            No reviews yet — yours could be the first!
                        </p>
                    </div>
                {:else}
                    <div
                        class="feedback-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {#each displayedReviews as review (review.publicId)}
                            <article
                                class="feedback-card flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 opacity-0 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
                            >
                                <!-- Stars -->
                                <div class="flex gap-0.5">
                                    {#each [1, 2, 3, 4, 5] as s (s)}
                                        <StarIcon
                                            class="size-4 {review.rating >= s
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-zinc-700'}"
                                        />
                                    {/each}
                                </div>

                                <!-- Comment -->
                                {#if review.comment}
                                    <p
                                        class="flex-1 text-sm/relaxed italic text-zinc-300"
                                    >
                                        &ldquo;{review.comment}&rdquo;
                                    </p>
                                {:else}
                                    <p
                                        class="flex-1 text-sm italic text-zinc-600"
                                    >
                                        No written review.
                                    </p>
                                {/if}

                                <!-- Author -->
                                <div
                                    class="flex items-center justify-between border-t border-zinc-800 pt-3"
                                >
                                    <div class="flex items-center gap-2">
                                        <div
                                            class="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-bold text-blue-300"
                                        >
                                            {review.userName
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        <span
                                            class="truncate text-sm font-medium text-zinc-200"
                                            >{review.userName}</span
                                        >
                                    </div>
                                    <span class="shrink-0 text-xs text-zinc-600"
                                        >{formatMonth(review.createdAt)}</span
                                    >
                                </div>
                            </article>
                        {/each}
                    </div>

                    {#if reviews.length > 6}
                        <div class="mt-6 text-center">
                            <a
                                href="/feedback"
                                class="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-400 transition-colors hover:text-blue-300"
                            >
                                See all {reviews.length} reviews
                                <ArrowRightIcon class="size-4" />
                            </a>
                        </div>
                    {/if}
                {/if}
            </div>

            <!-- ── Submit Panel ── -->
            <div class="w-full shrink-0 lg:w-80">
                <div
                    class="sticky top-24 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6"
                >
                    {#if submitted}
                        <!-- Success State -->
                        <div
                            class="flex flex-col items-center gap-4 py-4 text-center"
                        >
                            <div
                                class="flex size-14 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30"
                            >
                                <SendIcon class="size-6 text-emerald-400" />
                            </div>
                            <div>
                                <p class="font-semibold text-zinc-100">
                                    Thank you!
                                </p>
                                <p class="mt-1 text-sm text-zinc-400">
                                    Your review is under review and will appear
                                    once approved by our team.
                                </p>
                            </div>
                            <div class="flex gap-0.5">
                                {#each [1, 2, 3, 4, 5] as s (s)}
                                    <StarIcon
                                        class="size-5 {submittedRating >= s
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-zinc-700'}"
                                    />
                                {/each}
                            </div>
                            <button
                                type="button"
                                class="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-400 hover:underline"
                                onclick={() => (submitted = false)}
                            >
                                Leave another review
                            </button>
                        </div>
                    {:else}
                        <!-- Feedback Form (open to all visitors) -->
                        <div class="flex flex-col gap-5">
                            <div>
                                <p class="font-semibold text-zinc-100">
                                    Share Your Experience
                                </p>
                                <p class="mt-0.5 text-xs text-zinc-500">
                                    Love the food? Let others know!
                                </p>
                            </div>

                            <!-- Name -->
                            <div class="flex flex-col gap-1.5">
                                <label
                                    for="feedback-name"
                                    class="text-xs font-medium text-zinc-400"
                                >
                                    Your name
                                </label>
                                <input
                                    id="feedback-name"
                                    type="text"
                                    bind:value={customerName}
                                    placeholder="e.g. Maria Santos"
                                    maxlength={100}
                                    autocomplete="name"
                                    disabled={submitMutation.isPending}
                                    class="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50"
                                />
                            </div>

                            <!-- Stars -->
                            <div class="flex flex-col gap-2">
                                <span class="text-xs font-medium text-zinc-400"
                                    >Your rating</span
                                >
                                <div class="flex gap-1">
                                    {#each [1, 2, 3, 4, 5] as s (s)}
                                        <button
                                            type="button"
                                            class="cursor-pointer transition-transform hover:scale-110 disabled:opacity-50"
                                            onmouseenter={() =>
                                                (hoveredRating = s)}
                                            onmouseleave={() =>
                                                (hoveredRating = 0)}
                                            onclick={() => (rating = s)}
                                            aria-label="Rate {s} star{s > 1
                                                ? 's'
                                                : ''}"
                                            disabled={submitMutation.isPending}
                                        >
                                            <svg
                                                viewBox="0 0 24 24"
                                                class="size-8 transition-colors"
                                                aria-hidden="true"
                                                stroke-width="2"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                            >
                                                <polygon
                                                    points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                                                    fill={activeStars >= s
                                                        ? '#facc15'
                                                        : 'none'}
                                                    stroke={activeStars >= s
                                                        ? '#facc15'
                                                        : '#71717a'}
                                                />
                                            </svg>
                                        </button>
                                    {/each}
                                </div>
                                {#if rating > 0}
                                    <span
                                        class="text-xs font-medium text-yellow-400"
                                    >
                                        {RATING_LABELS[rating]}
                                    </span>
                                {/if}
                            </div>

                            <!-- Comment -->
                            <div class="flex flex-col gap-1.5">
                                <label
                                    for="feedback-comment"
                                    class="text-xs font-medium text-zinc-400"
                                >
                                    Comment <span class="text-zinc-600"
                                        >(optional)</span
                                    >
                                </label>
                                <textarea
                                    id="feedback-comment"
                                    bind:value={comment}
                                    placeholder="Tell us what you loved…"
                                    maxlength={512}
                                    rows={3}
                                    disabled={submitMutation.isPending}
                                    class="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 disabled:opacity-50"
                                ></textarea>
                                <span class="text-right text-xs text-zinc-600"
                                    >{comment.length}/512</span
                                >
                            </div>

                            <!-- Submit -->
                            <button
                                type="button"
                                disabled={!canSubmit ||
                                    submitMutation.isPending}
                                onclick={() => submitMutation.mutate()}
                                class="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition-all hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {#if submitMutation.isPending}
                                    <span
                                        class="size-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                                    ></span>
                                    Submitting…
                                {:else}
                                    <SendIcon class="size-4" />
                                    Submit Review
                                {/if}
                            </button>

                            <p class="text-center text-xs text-zinc-600">
                                Protected by CAPTCHA verification.
                            </p>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</section>
