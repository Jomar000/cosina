<script lang="ts">
    import ArrowRightIcon from '@lucide/svelte/icons/arrow-right'
    import CheckIcon from '@lucide/svelte/icons/check'
    import FlameIcon from '@lucide/svelte/icons/flame'
    import HeartIcon from '@lucide/svelte/icons/heart'
    import MenuIcon from '@lucide/svelte/icons/menu'
    import PackageIcon from '@lucide/svelte/icons/package'
    import PackageSearchIcon from '@lucide/svelte/icons/package-search'
    import SearchIcon from '@lucide/svelte/icons/search'
    import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import StarIcon from '@lucide/svelte/icons/star'
    import UtensilsIcon from '@lucide/svelte/icons/utensils'
    import XIcon from '@lucide/svelte/icons/x'
    import cookingImg from '$lib/assets/image/cooking.png'
    import heroBgImg from '$lib/assets/image/bgLogin1.png'
    import logoImg from '$lib/assets/image/logo.jpg'
    import videoSrc from '$lib/assets/video/cosina1.mp4?url'
    import { animate, inView, stagger } from 'motion'
    import { slide } from 'svelte/transition'

    ///////////////
    // 03. State //
    ///////////////

    let mobileMenuOpen = $state(false)

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        // Hero entrance — staggered explicit delays
        animate(
            '.hero-badge',
            {
                opacity: [
                    0,
                    1,
                ],
                transform: [
                    'translateY(-8px)',
                    'translateY(0px)',
                ],
            },
            { duration: 0.4, delay: 0.15 },
        )
        animate(
            '.hero-headline',
            {
                opacity: [
                    0,
                    1,
                ],
                transform: [
                    'translateY(32px)',
                    'translateY(0px)',
                ],
            },
            { duration: 0.65, delay: 0.3 },
        )
        animate(
            '.hero-sub',
            {
                opacity: [
                    0,
                    1,
                ],
                transform: [
                    'translateY(20px)',
                    'translateY(0px)',
                ],
            },
            { duration: 0.5, delay: 0.5 },
        )
        animate(
            '.hero-ctas',
            {
                opacity: [
                    0,
                    1,
                ],
                transform: [
                    'translateY(16px)',
                    'translateY(0px)',
                ],
            },
            { duration: 0.5, delay: 0.65 },
        )
        animate(
            '.hero-image',
            {
                opacity: [
                    0,
                    1,
                ],
                transform: [
                    'translateX(40px)',
                    'translateX(0px)',
                ],
            },
            { duration: 0.7, delay: 0.4 },
        )
        animate(
            '.hero-scroll',
            {
                opacity: [
                    0,
                    1,
                ],
            },
            { duration: 0.5, delay: 1.0 },
        )

        // Scroll-reveal sections
        const stops: Array<() => void> = []

        stops.push(
            inView(
                '.cards-grid',
                (element) => {
                    animate(
                        element.querySelectorAll('.reveal-card'),
                        {
                            opacity: [
                                0,
                                1,
                            ],
                            transform: [
                                'translateY(48px)',
                                'translateY(0px)',
                            ],
                        },
                        { duration: 0.55, delay: stagger(0.12) },
                    )
                },
                { amount: 0.1 },
            ),
        )

        stops.push(
            inView(
                '.steps-grid',
                (element) => {
                    animate(
                        element.querySelectorAll('.reveal-step'),
                        {
                            opacity: [
                                0,
                                1,
                            ],
                            transform: [
                                'translateY(40px)',
                                'translateY(0px)',
                            ],
                        },
                        { duration: 0.55, delay: stagger(0.15) },
                    )
                },
                { amount: 0.1 },
            ),
        )

        stops.push(
            inView(
                '.features-grid',
                (element) => {
                    animate(
                        element.querySelectorAll('.reveal-feature'),
                        {
                            opacity: [
                                0,
                                1,
                            ],
                            transform: [
                                'translateY(30px)',
                                'translateY(0px)',
                            ],
                        },
                        { duration: 0.5, delay: stagger(0.08) },
                    )
                },
                { amount: 0.15 },
            ),
        )

        stops.push(
            inView(
                '.story-content',
                (element) => {
                    animate(
                        element.querySelectorAll('.reveal-story'),
                        {
                            opacity: [
                                0,
                                1,
                            ],
                            transform: [
                                'translateY(32px)',
                                'translateY(0px)',
                            ],
                        },
                        { duration: 0.55, delay: stagger(0.12) },
                    )
                },
                { amount: 0.1 },
            ),
        )

        return () => stops.forEach((fn) => fn())
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    function closeMobileMenu() {
        mobileMenuOpen = false
    }
</script>

<!-- ===== FOOD DECORATION SNIPPETS ===== -->
<!-- UI note: parent opacity 0.20–0.22, SVG fill-opacity 0.55 → ~12 % actual fill + ~21 % stroke on dark bg -->

{#snippet ingGarlic(size: number, cls: string)}
    <div
        class="pointer-events-none {cls}"
        aria-hidden="true"
    >
        <!-- Garlic head — 3 distinct cloves, papery base, root hairs, tiny sprout -->
        <svg
            width={size}
            height={size}
            viewBox="-38 -62 76 108"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path
                d="M-18,-30 C-30,-30 -36,-20 -36,-10 C-36,0 -28,8 -18,10 C-10,8 -6,2 -6,-8 C-6,-20 -12,-30 -18,-30Z"
                fill="currentColor"
                fill-opacity="0.55"
                stroke-width="2"
            />
            <path
                d="M0,-46 C-12,-46 -18,-34 -18,-22 C-18,-10 -10,2 0,6 C10,2 18,-10 18,-22 C18,-34 12,-46 0,-46Z"
                fill="currentColor"
                fill-opacity="0.55"
                stroke-width="2.2"
            />
            <path
                d="M18,-30 C30,-30 36,-20 36,-10 C36,0 28,8 18,10 C10,8 6,2 6,-8 C6,-20 12,-30 18,-30Z"
                fill="currentColor"
                fill-opacity="0.55"
                stroke-width="2"
            />
            <path
                d="M-32,16 C-24,34 -12,40 0,40 C12,40 24,34 32,16"
                fill="currentColor"
                fill-opacity="0.30"
                stroke-width="1.8"
            />
            <ellipse
                cx="0"
                cy="38"
                rx="16"
                ry="5"
                stroke-width="1.4"
            />
            <path
                d="M-12,42 L-14,50 M-6,43 L-6,52 M0,43 L0,52 M6,43 L6,52 M12,42 L14,50"
                stroke-width="1.1"
            />
            <path
                d="M0,-46 C-2,-52 -2,-58 0,-60 C2,-58 2,-52 0,-46"
                fill="currentColor"
                fill-opacity="0.55"
                stroke-width="1.4"
            />
        </svg>
    </div>
{/snippet}

{#snippet ingBread(size: number, cls: string)}
    <div
        class="pointer-events-none {cls}"
        aria-hidden="true"
    >
        <!-- Bread loaf — domed top, baker's scoring slashes, crust base -->
        <svg
            width={size}
            height={size}
            viewBox="-46 -38 92 80"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <!-- Loaf dome -->
            <path
                d="M-44,22 C-44,6 -36,-34 0,-34 C36,-34 44,6 44,22Z"
                fill="currentColor"
                fill-opacity="0.55"
                stroke-width="2.5"
            />
            <!-- Baker's scoring slash (top) -->
            <path
                d="M-24,-20 C-8,-34 8,-34 24,-20"
                stroke-width="2"
            />
            <!-- Second score indent -->
            <path
                d="M-10,-28 C0,-36 10,-28"
                stroke-width="1.6"
            />
            <!-- Horizontal base line -->
            <line
                x1="-44"
                y1="22"
                x2="44"
                y2="22"
                stroke-width="2"
            />
            <!-- Bottom crust -->
            <path
                d="M-44,22 C-44,36 -24,38 0,38 C24,38 44,36 44,22"
                fill="currentColor"
                fill-opacity="0.35"
                stroke-width="1.8"
            />
        </svg>
    </div>
{/snippet}

{#snippet ingOnion(size: number, cls: string)}
    <div
        class="pointer-events-none {cls}"
        aria-hidden="true"
    >
        <!-- Bulb onion — round body, concentric layer arcs, neck, green shoots, root hairs -->
        <svg
            width={size}
            height={size}
            viewBox="-34 -62 68 108"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <!-- Main bulb -->
            <path
                d="M0,-30 C-24,-30 -32,-16 -32,6 C-32,26 -18,42 0,42 C18,42 32,26 32,6 C32,-16 24,-30 0,-30Z"
                fill="currentColor"
                fill-opacity="0.55"
                stroke-width="2.5"
            />
            <!-- Upper layer arc -->
            <path
                d="M-22,-14 C-16,-24 -8,-28 0,-28 C8,-28 16,-24 22,-14"
                stroke-width="1.3"
            />
            <!-- Lower layer arc -->
            <path
                d="M-26,12 C-20,26 -10,36 0,40 C10,36 20,26 26,12"
                stroke-width="1.1"
            />
            <!-- Neck -->
            <path
                d="M-10,-30 C-8,-38 -4,-42 0,-44 C4,-42 8,-38 10,-30"
                fill="currentColor"
                fill-opacity="0.55"
                stroke-width="2"
            />
            <!-- Green shoots -->
            <path
                d="M-4,-44 C-8,-50 -4,-58 0,-56"
                stroke-width="2.2"
            />
            <path
                d="M4,-44 C8,-50 4,-58 0,-56"
                stroke-width="2.2"
            />
            <!-- Root hairs -->
            <path
                d="M-12,42 L-14,50 M-6,43 L-6,52 M0,42 L0,52 M6,43 L6,52 M12,42 L14,50"
                stroke-width="1.2"
            />
        </svg>
    </div>
{/snippet}

{#snippet ingNoodleCup(size: number, cls: string)}
    <div
        class="pointer-events-none {cls}"
        aria-hidden="true"
    >
        <!-- Instant noodle cup — trapezoidal cup, oval rim, noodle wisps, steam wisps -->
        <svg
            width={size}
            height={size}
            viewBox="-40 -58 80 110"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <!-- Cup body (wider top → narrower bottom) -->
            <path
                d="M-38,-12 L-28,46 L28,46 L38,-12Z"
                fill="currentColor"
                fill-opacity="0.55"
                stroke-width="2.5"
            />
            <!-- Lid / rim ellipse -->
            <ellipse
                cx="0"
                cy="-12"
                rx="38"
                ry="10"
                fill="currentColor"
                fill-opacity="0.45"
                stroke-width="2.5"
            />
            <!-- Noodle wisps peeking out from lid -->
            <path
                d="M-28,-14 C-16,-28 -4,-12 8,-24 C18,-34 26,-20 28,-12"
                stroke-width="2.2"
            />
            <path
                d="M-22,-8 C-10,-22 2,-6 14,-18 C22,-28 28,-14 24,-8"
                stroke-width="2"
            />
            <!-- Steam wisps -->
            <path
                d="M-12,-28 C-14,-38 -10,-44 -12,-54"
                stroke-width="1.8"
            />
            <path
                d="M0,-30 C2,-40 -2,-46 0,-56"
                stroke-width="1.8"
            />
            <path
                d="M12,-28 C14,-38 10,-44 12,-54"
                stroke-width="1.8"
            />
            <!-- Decorative label band -->
            <path
                d="M-35,6 L-31,28 L31,28 L35,6Z"
                fill="currentColor"
                fill-opacity="0.20"
                stroke-width="0.8"
                stroke-opacity="0.5"
            />
        </svg>
    </div>
{/snippet}

{#snippet ingNoodles(size: number, cls: string)}
    <div
        class="pointer-events-none {cls}"
        aria-hidden="true"
    >
        <!-- Noodle strands — 5 parallel wavy lines (sine-wave pattern) -->
        <svg
            width={size}
            height={size}
            viewBox="-50 -30 100 60"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
        >
            <path
                d="M-50,-20 C-38,-29 -26,-11 -14,-20 C-2,-29 10,-11 22,-20 C34,-29 46,-11 50,-20"
                stroke-width="3"
            />
            <path
                d="M-50,-10 C-38,-19 -26,-1 -14,-10 C-2,-19 10,-1 22,-10 C34,-19 46,-1 50,-10"
                stroke-width="3"
            />
            <path
                d="M-50,0 C-38,-9 -26,9 -14,0 C-2,-9 10,9 22,0 C34,-9 46,9 50,0"
                stroke-width="3"
            />
            <path
                d="M-50,10 C-38,1 -26,19 -14,10 C-2,1 10,19 22,10 C34,1 46,19 50,10"
                stroke-width="3"
            />
            <path
                d="M-50,20 C-38,11 -26,29 -14,20 C-2,11 10,29 22,20 C34,11 46,29 50,20"
                stroke-width="3"
            />
        </svg>
    </div>
{/snippet}

{#snippet ingChopsticks(size: number, cls: string)}
    <div
        class="pointer-events-none {cls}"
        aria-hidden="true"
    >
        <!-- Chopsticks — two tapered sticks with lacquer grip bands near the top -->
        <svg
            width={size}
            height={size}
            viewBox="-26 -56 52 112"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
        >
            <!-- Left chopstick (converges inward toward the tip) -->
            <line
                x1="-14"
                y1="-54"
                x2="-10"
                y2="54"
                stroke-width="4"
            />
            <!-- Right chopstick -->
            <line
                x1="14"
                y1="-54"
                x2="10"
                y2="54"
                stroke-width="4"
            />
            <!-- Grip decoration bands — left stick -->
            <line
                x1="-14"
                y1="-40"
                x2="-13"
                y2="-30"
                stroke-width="2"
                stroke-opacity="0.55"
            />
            <line
                x1="-14"
                y1="-26"
                x2="-13"
                y2="-16"
                stroke-width="2"
                stroke-opacity="0.55"
            />
            <!-- Grip decoration bands — right stick -->
            <line
                x1="14"
                y1="-40"
                x2="13"
                y2="-30"
                stroke-width="2"
                stroke-opacity="0.55"
            />
            <line
                x1="14"
                y1="-26"
                x2="13"
                y2="-16"
                stroke-width="2"
                stroke-opacity="0.55"
            />
        </svg>
    </div>
{/snippet}

<!-- ===== NAVBAR ===== -->
<header
    class="fixed top-0 z-50 w-full border-b border-white/5 bg-zinc-950/80 backdrop-blur-md"
>
    <div
        class="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 sm:px-6"
    >
        <!-- Brand logo -->
        <a
            href="/"
            class="flex items-center gap-2.5"
        >
            <img
                src={logoImg}
                alt="Cosina Ni Cacai logo"
                class="size-10 rounded-xl object-cover"
            />
            <div>
                <span class="text-sm font-bold leading-none text-zinc-100"
                    >Cosina Ni Cacai</span
                >
                <p class="mt-0.5 text-[9px] leading-none text-zinc-500">
                    Home-cooked meals
                </p>
            </div>
        </a>

        <!-- Desktop nav -->
        <nav
            class="hidden items-center gap-6 md:flex"
            aria-label="Main navigation"
        >
            <a
                href="/"
                class="text-sm font-medium text-blue-400">Home</a
            >
            <a
                href="/order"
                class="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
                >Order</a
            >
            <a
                href="/track"
                class="text-sm font-medium text-zinc-400 transition-colors hover:text-zinc-100"
                >Track Order</a
            >
        </nav>

        <!-- Right actions -->
        <div class="flex items-center gap-2">
            <a
                href="/order"
                class="hidden rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 sm:block"
            >
                Order Now
            </a>
            <button
                type="button"
                onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={mobileMenuOpen}
                class="flex size-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 md:hidden"
            >
                {#if mobileMenuOpen}
                    <XIcon class="size-4 " />
                {:else}
                    <MenuIcon class="size-4 " />
                {/if}
            </button>
        </div>
    </div>

    <!-- Mobile menu -->
    {#if mobileMenuOpen}
        <div
            transition:slide={{ duration: 200 }}
            class="border-t border-zinc-800 bg-zinc-950 px-4 pb-4 pt-3 md:hidden"
        >
            <nav
                class="flex flex-col gap-3"
                aria-label="Mobile navigation"
            >
                <a
                    href="/"
                    onclick={closeMobileMenu}
                    class="text-sm font-medium text-blue-400">Home</a
                >
                <a
                    href="/order"
                    onclick={closeMobileMenu}
                    class="text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100"
                    >Order</a
                >
                <a
                    href="/track"
                    onclick={closeMobileMenu}
                    class="text-sm font-medium text-zinc-300 transition-colors hover:text-zinc-100"
                    >Track Order</a
                >
                <div class="mt-1 border-t border-zinc-800 pt-3">
                    <a
                        href="/order"
                        class="block rounded-lg bg-blue-600 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-blue-500"
                    >
                        Order Now
                    </a>
                </div>
            </nav>
        </div>
    {/if}
</header>

<div class="bg-zinc-950 text-zinc-100">
    <!-- ===== HERO ===== -->
    <section class="relative min-h-dvh overflow-hidden pb-16 pt-20">
        <!-- Ingredient decorations -->
        {@render ingBread(
            140,
            'absolute -top-10 -left-12 -rotate-[15deg] text-amber-200 opacity-[0.09]',
        )}
        {@render ingGarlic(
            170,
            'absolute -bottom-10 -right-14 rotate-[20deg] text-amber-200 opacity-[0.10]',
        )}
        {@render ingChopsticks(
            96,
            'absolute top-1/3 -right-2 rotate-[6deg] text-amber-200 opacity-[0.08]',
        )}
        <!-- Ambient glow -->
        <div
            class="pointer-events-none absolute -left-32 top-1/4 size-96 rounded-full bg-indigo-600/10 blur-3xl"
            aria-hidden="true"
        ></div>
        <div
            class="pointer-events-none absolute -right-24 top-1/3 size-72 rounded-full bg-blue-600/8 blur-3xl"
            aria-hidden="true"
        ></div>
        <div
            class="pointer-events-none absolute bottom-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-purple-600/5 blur-3xl"
            aria-hidden="true"
        ></div>

        <div
            class="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:gap-12 lg:py-20"
        >
            <!-- Left: headline + copy + CTAs -->
            <div class="flex-1 text-center lg:text-left">
                <!-- Badge -->
                <div
                    class="hero-badge mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 opacity-0"
                >
                    <span
                        class="size-1.5 animate-pulse rounded-full bg-blue-400"
                    ></span>
                    <span class="text-xs font-medium text-blue-300"
                        >✦ Order Online · Fresh Daily</span
                    >
                </div>

                <!-- Headline -->
                <h1
                    class="hero-headline text-4xl font-extrabold tracking-tight text-zinc-100 opacity-0 sm:text-5xl lg:text-[3.5rem] lg:leading-tight"
                >
                    Authentic Filipino
                    <span
                        class="block bg-linear-to-r from-blue-400 via-indigo-300 to-violet-400 bg-clip-text text-transparent"
                    >
                        Home Cooking
                    </span>
                </h1>

                <!-- Sub-copy -->
                <p
                    class="hero-sub mx-auto mt-5 max-w-lg text-base/relaxed text-zinc-400 opacity-0 lg:mx-0 sm:text-lg"
                >
                    Cosina Ni Cacai brings the warmth of Filipino
                    <em class="not-italic text-zinc-300">lutong bahay</em>
                    straight to your table — bilao packages, bundle deals, and fresh
                    daily picks.
                </p>

                <!-- CTAs -->
                <div
                    class="hero-ctas mt-8 flex flex-col items-center gap-3 opacity-0 sm:flex-row sm:justify-center lg:justify-start"
                >
                    <a
                        href="/order"
                        class="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-700/30 transition-all hover:bg-blue-500 hover:shadow-blue-600/30 active:scale-[0.98] sm:w-auto"
                    >
                        Order Now
                        <ArrowRightIcon
                            class="size-4  transition-transform group-hover:translate-x-0.5"
                        />
                    </a>
                    <a
                        href="/track"
                        class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-7 py-3.5 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-600 hover:text-zinc-100 active:scale-[0.98] sm:w-auto"
                    >
                        <PackageSearchIcon class="size-4 " />
                        Track Order
                    </a>
                </div>

                <!-- Scroll indicator -->
                <div
                    class="hero-scroll mt-10 flex justify-center opacity-0 lg:justify-start"
                >
                    <div class="flex flex-col items-center gap-2 text-zinc-600">
                        <span class="text-xs tracking-wider"
                            >Scroll to explore</span
                        >
                        <div
                            class="h-7 w-px bg-linear-to-b from-zinc-600 to-transparent"
                        ></div>
                    </div>
                </div>
            </div>

            <!-- Right: cooking hero video -->
            <div
                class="hero-image relative flex flex-1 items-center justify-center opacity-0"
            >
                <div class="relative w-96">
                    <!-- Glow halo behind video -->
                    <div
                        class="pointer-events-none absolute -inset-3 rounded-3xl bg-indigo-600/15 blur-2xl"
                        aria-hidden="true"
                    ></div>
                    <video
                        src={videoSrc}
                        autoplay
                        muted
                        loop
                        playsinline
                        class="relative w-full rounded-3xl border border-white/10 object-cover shadow-2xl"
                    ></video>
                </div>
            </div>
        </div>
    </section>

    <!-- ===== WHAT WE OFFER ===== -->
    <section class="relative overflow-hidden py-24">
        {@render ingNoodleCup(
            180,
            'absolute -top-12 -right-12 text-amber-200 opacity-[0.09]',
        )}
        {@render ingNoodles(
            100,
            'absolute -bottom-2 -left-4 rotate-[35deg] text-amber-200 opacity-[0.10]',
        )}
        {@render ingNoodles(
            84,
            'absolute bottom-6 left-16 rotate-[55deg] text-amber-200 opacity-[0.08]',
        )}
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
            <div class="mb-14 text-center">
                <p
                    class="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400"
                >
                    What We Offer
                </p>
                <h2
                    class="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl"
                >
                    Our Signature Packages
                </h2>
                <p class="mx-auto mt-3 max-w-md text-sm text-zinc-400">
                    From celebration bilao to everyday meals — the perfect
                    package for every occasion.
                </p>
            </div>

            <div class="cards-grid grid grid-cols-1 gap-5 sm:grid-cols-3">
                <!-- Bilao Package -->
                <article
                    class="reveal-card group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 opacity-0 transition-colors hover:border-blue-500/40 hover:bg-zinc-900"
                >
                    <div
                        class="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/20 transition-all group-hover:bg-blue-500/25 group-hover:ring-blue-500/40"
                    >
                        <UtensilsIcon class="size-5  text-blue-400" />
                    </div>
                    <h3 class="mb-2 text-base font-semibold text-zinc-100">
                        Bilao Package
                    </h3>
                    <p class="mb-5 text-sm/relaxed text-zinc-400">
                        Large-format bilao meals perfect for celebrations,
                        fiestas, and family gatherings.
                    </p>
                    <a
                        href="/order"
                        class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
                    >
                        Order now <ArrowRightIcon class="size-3.5 " />
                    </a>
                </article>

                <!-- Bundle Package -->
                <article
                    class="reveal-card group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 opacity-0 transition-colors hover:border-blue-500/40 hover:bg-zinc-900"
                >
                    <div
                        class="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/20 transition-all group-hover:bg-blue-500/25 group-hover:ring-blue-500/40"
                    >
                        <PackageIcon class="size-5  text-blue-400" />
                    </div>
                    <h3 class="mb-2 text-base font-semibold text-zinc-100">
                        Bundle Package
                    </h3>
                    <p class="mb-5 text-sm/relaxed text-zinc-400">
                        Curated bundles for groups — more variety, better value
                        with every order.
                    </p>
                    <a
                        href="/order"
                        class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
                    >
                        Order now <ArrowRightIcon class="size-3.5 " />
                    </a>
                </article>

                <!-- Single Order -->
                <article
                    class="reveal-card group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 opacity-0 transition-colors hover:border-blue-500/40 hover:bg-zinc-900"
                >
                    <div
                        class="mb-4 flex size-12 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/20 transition-all group-hover:bg-blue-500/25 group-hover:ring-blue-500/40"
                    >
                        <ShoppingBagIcon class="size-5  text-blue-400" />
                    </div>
                    <h3 class="mb-2 text-base font-semibold text-zinc-100">
                        Single Order
                    </h3>
                    <p class="mb-5 text-sm/relaxed text-zinc-400">
                        Individual servings made fresh daily —
                        <em class="not-italic text-zinc-300">lutong bahay</em>
                        taste just for you.
                    </p>
                    <a
                        href="/order"
                        class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
                    >
                        Order now <ArrowRightIcon class="size-3.5 " />
                    </a>
                </article>
            </div>
        </div>
    </section>

    <!-- ===== OUR STORY ===== -->
    <section class="relative overflow-hidden py-24">
        {@render ingOnion(
            176,
            'absolute -bottom-12 -left-12 text-amber-200 opacity-[0.09]',
        )}
        {@render ingBread(
            108,
            'absolute top-6 -right-6 rotate-[40deg] text-amber-200 opacity-[0.10]',
        )}
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
            <div
                class="story-content flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16"
            >
                <!-- Left: Cacai cooking illustration -->
                <div class="reveal-story relative flex-1">
                    <div
                        class="pointer-events-none absolute -inset-6 rounded-full bg-blue-600/10 blur-3xl"
                        aria-hidden="true"
                    ></div>
                    <img
                        src={cookingImg}
                        alt="Cacai cooking authentic Filipino dishes in her kitchen"
                        class="relative mx-auto w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl lg:max-w-none"
                    />
                </div>

                <!-- Right: story text + stats -->
                <div class="flex-1">
                    <div class="reveal-story opacity-0">
                        <p
                            class="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400"
                        >
                            Our Story
                        </p>
                        <h2
                            class="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl"
                        >
                            From Cacai's Kitchen<br />to Your Table
                        </h2>
                    </div>

                    <div class="reveal-story mt-5 opacity-0">
                        <p class="text-sm/relaxed text-zinc-400">
                            What started as a love of sharing home-cooked meals
                            with family has grown into something truly special.
                            Cacai's passion for authentic Filipino
                            <em class="not-italic text-zinc-300"
                                >lutong bahay</em
                            >
                            means every dish is prepared with the same warmth and
                            care as if you were sitting at her own dining table.
                        </p>
                        <p class="mt-3 text-sm/relaxed text-zinc-400">
                            From celebration bilaos to everyday family meals,
                            each order is made fresh on the day — no shortcuts,
                            no preservatives. Just real food, cooked with love.
                        </p>
                    </div>

                    <!-- Stats row -->
                    <div
                        class="reveal-story mt-8 grid grid-cols-3 gap-4 border-t border-zinc-800 pt-8 opacity-0"
                    >
                        <div>
                            <p class="text-2xl font-bold text-zinc-100">5+</p>
                            <p class="mt-0.5 text-xs text-zinc-500">
                                Years cooking
                            </p>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-zinc-100">500+</p>
                            <p class="mt-0.5 text-xs text-zinc-500">
                                Happy orders
                            </p>
                        </div>
                        <div>
                            <p class="text-2xl font-bold text-zinc-100">100%</p>
                            <p class="mt-0.5 text-xs text-zinc-500">Homemade</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- ===== HOW IT WORKS ===== -->
    <section class="relative overflow-hidden bg-zinc-900/30 py-24">
        {@render ingGarlic(
            148,
            'absolute top-4 -left-10 -rotate-[10deg] text-amber-200 opacity-[0.09]',
        )}
        {@render ingChopsticks(
            160,
            'absolute -bottom-12 -right-8 rotate-[25deg] text-amber-200 opacity-[0.10]',
        )}
        <div class="mx-auto max-w-6xl px-4 sm:px-6">
            <div
                class="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16"
            >
                <!-- Left: food image -->
                <div class="relative w-full flex-1">
                    <div
                        class="pointer-events-none absolute -inset-4 rounded-3xl bg-blue-600/10 blur-2xl"
                        aria-hidden="true"
                    ></div>
                    <img
                        src={heroBgImg}
                        alt="Cosina Ni Cacai food spread with delicious Filipino dishes"
                        class="relative w-full rounded-3xl border border-white/10 shadow-2xl"
                    />
                </div>

                <!-- Right: header + vertical steps -->
                <div class="flex-1">
                    <p
                        class="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400"
                    >
                        How to Order
                    </p>
                    <h2
                        class="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl"
                    >
                        Simple as 1-2-3
                    </h2>
                    <p class="mt-3 text-sm text-zinc-400">
                        Order your favourite meal in just a few taps.
                    </p>

                    <div class="steps-grid mt-8 flex flex-col gap-0">
                        {#each [{ num: 1, icon: SearchIcon, color: 'blue', title: 'Browse the Menu', desc: 'Filter by category — Bilao, Bundle, or Single Order — or search for your favourite dish.' }, { num: 2, icon: ShoppingCartIcon, color: 'blue', title: 'Add Items to Cart', desc: 'Pick items, choose sizes, and adjust quantities in your cart before checkout.' }, { num: 3, icon: CheckIcon, color: 'blue', title: 'Fill Order Details & Pay Downpayment', desc: 'Enter your name, contact, delivery type, and date. Send your GCash downpayment and upload the screenshot as proof.' }, { num: 4, icon: PackageSearchIcon, color: 'emerald', title: 'Submit & Track with Your Code', desc: 'After submitting, save your Tracking Code and monitor your order status in real time at /track.' }, { num: 5, icon: StarIcon, color: 'amber', title: 'Pay Balance & Enjoy!', desc: 'Pay any remaining balance when prompted, then sit back as your freshly cooked meal makes its way to you.' }] as s, i (s.num)}
                            <div
                                class="reveal-step flex items-start gap-5 opacity-0"
                            >
                                <div
                                    class="relative shrink-0 flex flex-col items-center"
                                >
                                    <div
                                        class="flex size-14 items-center justify-center rounded-2xl
                                            {s.color === 'emerald'
                                            ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30'
                                            : s.color === 'amber'
                                              ? 'bg-amber-500/15 ring-1 ring-amber-500/30'
                                              : 'bg-blue-500/15 ring-1 ring-blue-500/30'}"
                                    >
                                        <s.icon
                                            class="size-6  {s.color ===
                                            'emerald'
                                                ? 'text-emerald-400'
                                                : s.color === 'amber'
                                                  ? 'text-amber-400'
                                                  : 'text-blue-400'}"
                                        />
                                    </div>
                                    <span
                                        class="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full text-xs font-bold text-white
                                            {s.color === 'emerald'
                                            ? 'bg-emerald-600'
                                            : s.color === 'amber'
                                              ? 'bg-amber-500'
                                              : 'bg-blue-600'}"
                                        aria-hidden="true">{s.num}</span
                                    >
                                    {#if i < 4}
                                        <div
                                            class="mt-1 h-8 w-px bg-linear-to-b from-zinc-700 to-transparent"
                                            aria-hidden="true"
                                        ></div>
                                    {/if}
                                </div>
                                <div class="pb-6 pt-1">
                                    <h3
                                        class="mb-1 text-sm font-semibold text-zinc-100"
                                    >
                                        {s.title}
                                    </h3>
                                    <p class="text-xs/relaxed text-zinc-400">
                                        {s.desc}
                                    </p>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- ===== WHY CHOOSE US ===== -->
    <section class="relative overflow-hidden py-24">
        {@render ingNoodleCup(
            220,
            'absolute top-1/2 -right-4 -translate-y-1/2 text-amber-200 opacity-[0.07]',
        )}
        {@render ingNoodles(
            88,
            'absolute top-8 -left-6 rotate-[15deg] text-amber-200 opacity-[0.09]',
        )}
        {@render ingNoodles(
            80,
            'absolute bottom-10 left-[48%] rotate-[20deg] text-amber-200 opacity-[0.08]',
        )}
        {@render ingNoodles(
            80,
            'absolute bottom-6 left-[55%] -rotate-[12deg] text-amber-200 opacity-[0.07]',
        )}
        {@render ingNoodles(
            80,
            'absolute bottom-14 left-[41%] rotate-[38deg] text-amber-200 opacity-[0.08]',
        )}
        <div class="mx-auto max-w-5xl px-4 sm:px-6">
            <div class="mb-14 text-center">
                <p
                    class="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400"
                >
                    Why Us
                </p>
                <h2
                    class="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl"
                >
                    Made with Heart &amp; Fire
                </h2>
                <p class="mx-auto mt-3 max-w-sm text-sm text-zinc-400">
                    Every dish tells the story of generations of Filipino
                    cooking.
                </p>
            </div>

            <div class="features-grid grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div
                    class="reveal-feature rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 opacity-0 transition-colors hover:border-zinc-700"
                >
                    <div
                        class="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-500/10"
                    >
                        <FlameIcon class="size-5  text-blue-400" />
                    </div>
                    <h3 class="mb-1 text-sm font-semibold text-zinc-100">
                        Fresh Daily
                    </h3>
                    <p class="text-xs/relaxed text-zinc-500">
                        Cooked fresh on the day of your order — never
                        pre-packaged.
                    </p>
                </div>

                <div
                    class="reveal-feature rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 opacity-0 transition-colors hover:border-zinc-700"
                >
                    <div
                        class="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-500/10"
                    >
                        <StarIcon class="size-5  text-blue-400" />
                    </div>
                    <h3 class="mb-1 text-sm font-semibold text-zinc-100">
                        Authentic Flavors
                    </h3>
                    <p class="text-xs/relaxed text-zinc-500">
                        Time-honoured recipes passed down through generations.
                    </p>
                </div>

                <div
                    class="reveal-feature rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 opacity-0 transition-colors hover:border-zinc-700"
                >
                    <div
                        class="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-500/10"
                    >
                        <HeartIcon class="size-5  text-blue-400" />
                    </div>
                    <h3 class="mb-1 text-sm font-semibold text-zinc-100">
                        Made with Love
                    </h3>
                    <p class="text-xs/relaxed text-zinc-500">
                        Every bilao, every plate is prepared with care — just
                        like home.
                    </p>
                </div>

                <div
                    class="reveal-feature rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 opacity-0 transition-colors hover:border-zinc-700"
                >
                    <div
                        class="mb-3 flex size-10 items-center justify-center rounded-xl bg-blue-500/10"
                    >
                        <PackageSearchIcon class="size-5  text-blue-400" />
                    </div>
                    <h3 class="mb-1 text-sm font-semibold text-zinc-100">
                        Live Tracking
                    </h3>
                    <p class="text-xs/relaxed text-zinc-500">
                        Track your order in real-time from preparation to
                        delivery.
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- ===== FINAL CTA ===== -->
    <section class="py-24">
        <div class="mx-auto max-w-3xl px-4 sm:px-6">
            <div
                class="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-linear-to-br from-blue-600/15 via-indigo-600/10 to-violet-600/5 p-10 text-center sm:p-16"
            >
                <!-- Ingredient decorations -->
                {@render ingNoodleCup(
                    120,
                    'absolute -top-6 -left-6 text-blue-200 opacity-[0.12]',
                )}
                {@render ingNoodleCup(
                    100,
                    'absolute -bottom-4 -right-4 rotate-[45deg] text-blue-200 opacity-[0.10]',
                )}
                {@render ingNoodles(
                    72,
                    'absolute top-6 right-12 rotate-[20deg] text-blue-200 opacity-[0.12]',
                )}
                {@render ingNoodles(
                    64,
                    'absolute top-20 right-4 -rotate-[15deg] text-blue-200 opacity-[0.10]',
                )}
                {@render ingNoodles(
                    68,
                    'absolute bottom-8 left-8 rotate-[40deg] text-blue-200 opacity-[0.10]',
                )}
                <!-- Inner glow -->
                <div
                    class="pointer-events-none absolute inset-0 flex items-center justify-center"
                    aria-hidden="true"
                >
                    <div
                        class="h-52 w-72 rounded-full bg-blue-600/12 blur-3xl"
                    ></div>
                </div>

                <div class="relative">
                    <div
                        class="mx-auto mb-5 flex size-16 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/10"
                    >
                        <img
                            src={logoImg}
                            alt="Cosina Ni Cacai"
                            class="size-full object-cover"
                        />
                    </div>
                    <h2
                        class="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl"
                    >
                        Ready to taste the difference?
                    </h2>
                    <p class="mx-auto mt-3 max-w-sm text-sm text-zinc-400">
                        Order in minutes. No account required. Just good food,
                        made with love.
                    </p>
                    <a
                        href="/order"
                        class="group mt-8 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-700/30 transition-all hover:bg-blue-500 hover:shadow-blue-600/30 active:scale-[0.98]"
                    >
                        Order Now
                        <ArrowRightIcon
                            class="size-4  transition-transform group-hover:translate-x-0.5"
                        />
                    </a>
                    <p class="mt-4 text-xs text-zinc-600">
                        No account required · Order in minutes
                    </p>
                </div>
            </div>
        </div>
    </section>

    <!-- ===== FOOTER ===== -->
    <footer class="border-t border-zinc-800 py-8">
        <div
            class="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left"
        >
            <!-- Brand -->
            <a
                href="/"
                class="flex items-center gap-2.5"
            >
                <img
                    src={logoImg}
                    alt="Cosina Ni Cacai logo"
                    class="size-8 rounded-lg object-cover"
                />
                <div>
                    <span class="text-sm font-bold text-zinc-100"
                        >Cosina Ni Cacai</span
                    >
                    <p class="text-[9px] leading-none text-zinc-500">
                        Home-cooked meals
                    </p>
                </div>
            </a>

            <!-- Links -->
            <nav
                class="flex items-center gap-5 text-xs text-zinc-500"
                aria-label="Footer navigation"
            >
                <a
                    href="/order"
                    class="transition-colors hover:text-zinc-300">Order</a
                >
                <a
                    href="/track"
                    class="transition-colors hover:text-zinc-300">Track Order</a
                >
            </nav>

            <!-- Copyright -->
            <p class="text-xs text-zinc-600">© 2025 Cosina Ni Cacai</p>
        </div>
    </footer>
</div>
