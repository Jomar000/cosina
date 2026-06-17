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
                class="h-10 w-10 rounded-xl object-cover"
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
                class="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 md:hidden"
            >
                {#if mobileMenuOpen}
                    <XIcon class="h-4 w-4" />
                {:else}
                    <MenuIcon class="h-4 w-4" />
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
        <!-- Ambient glow -->
        <div
            class="pointer-events-none absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl"
            aria-hidden="true"
        ></div>
        <div
            class="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full bg-blue-600/8 blur-3xl"
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
                        class="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400"
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
                    class="hero-sub mx-auto mt-5 max-w-lg text-base leading-relaxed text-zinc-400 opacity-0 lg:mx-0 sm:text-lg"
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
                            class="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        />
                    </a>
                    <a
                        href="/track"
                        class="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-7 py-3.5 text-sm font-semibold text-zinc-300 transition-all hover:border-zinc-600 hover:text-zinc-100 active:scale-[0.98] sm:w-auto"
                    >
                        <PackageSearchIcon class="h-4 w-4" />
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
    <section class="py-24">
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
                        class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/20 transition-all group-hover:bg-blue-500/25 group-hover:ring-blue-500/40"
                    >
                        <UtensilsIcon class="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 class="mb-2 text-base font-semibold text-zinc-100">
                        Bilao Package
                    </h3>
                    <p class="mb-5 text-sm leading-relaxed text-zinc-400">
                        Large-format bilao meals perfect for celebrations,
                        fiestas, and family gatherings.
                    </p>
                    <a
                        href="/order"
                        class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
                    >
                        Order now <ArrowRightIcon class="h-3.5 w-3.5" />
                    </a>
                </article>

                <!-- Bundle Package -->
                <article
                    class="reveal-card group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 opacity-0 transition-colors hover:border-blue-500/40 hover:bg-zinc-900"
                >
                    <div
                        class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/20 transition-all group-hover:bg-blue-500/25 group-hover:ring-blue-500/40"
                    >
                        <PackageIcon class="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 class="mb-2 text-base font-semibold text-zinc-100">
                        Bundle Package
                    </h3>
                    <p class="mb-5 text-sm leading-relaxed text-zinc-400">
                        Curated bundles for groups — more variety, better value
                        with every order.
                    </p>
                    <a
                        href="/order"
                        class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
                    >
                        Order now <ArrowRightIcon class="h-3.5 w-3.5" />
                    </a>
                </article>

                <!-- Single Order -->
                <article
                    class="reveal-card group rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 opacity-0 transition-colors hover:border-blue-500/40 hover:bg-zinc-900"
                >
                    <div
                        class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15 ring-1 ring-blue-500/20 transition-all group-hover:bg-blue-500/25 group-hover:ring-blue-500/40"
                    >
                        <ShoppingBagIcon class="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 class="mb-2 text-base font-semibold text-zinc-100">
                        Single Order
                    </h3>
                    <p class="mb-5 text-sm leading-relaxed text-zinc-400">
                        Individual servings made fresh daily —
                        <em class="not-italic text-zinc-300">lutong bahay</em>
                        taste just for you.
                    </p>
                    <a
                        href="/order"
                        class="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300"
                    >
                        Order now <ArrowRightIcon class="h-3.5 w-3.5" />
                    </a>
                </article>
            </div>
        </div>
    </section>

    <!-- ===== OUR STORY ===== -->
    <section class="py-24">
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
                        <p class="text-sm leading-relaxed text-zinc-400">
                            What started as a love of sharing home-cooked meals
                            with family has grown into something truly special.
                            Cacai's passion for authentic Filipino
                            <em class="not-italic text-zinc-300"
                                >lutong bahay</em
                            >
                            means every dish is prepared with the same warmth and
                            care as if you were sitting at her own dining table.
                        </p>
                        <p class="mt-3 text-sm leading-relaxed text-zinc-400">
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
    <section class="bg-zinc-900/30 py-24">
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

                    <div class="steps-grid mt-10 flex flex-col gap-2">
                        <!-- Step 1 -->
                        <div
                            class="reveal-step flex items-start gap-5 opacity-0"
                        >
                            <div class="relative shrink-0">
                                <div
                                    class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-500/30"
                                >
                                    <SearchIcon class="h-6 w-6 text-blue-400" />
                                </div>
                                <span
                                    class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white"
                                    aria-hidden="true">1</span
                                >
                            </div>
                            <div class="pt-1">
                                <h3
                                    class="mb-1.5 text-sm font-semibold text-zinc-100"
                                >
                                    Browse the Menu
                                </h3>
                                <p
                                    class="text-xs leading-relaxed text-zinc-400"
                                >
                                    Explore our full range of packages and daily
                                    specials. Filter by category or search for
                                    your favourite dish.
                                </p>
                            </div>
                        </div>

                        <div
                            class="ml-7 h-6 w-px bg-linear-to-b from-blue-500/30 to-transparent"
                            aria-hidden="true"
                        ></div>

                        <!-- Step 2 -->
                        <div
                            class="reveal-step flex items-start gap-5 opacity-0"
                        >
                            <div class="relative shrink-0">
                                <div
                                    class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-500/30"
                                >
                                    <ShoppingCartIcon
                                        class="h-6 w-6 text-blue-400"
                                    />
                                </div>
                                <span
                                    class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white"
                                    aria-hidden="true">2</span
                                >
                            </div>
                            <div class="pt-1">
                                <h3
                                    class="mb-1.5 text-sm font-semibold text-zinc-100"
                                >
                                    Add to Cart
                                </h3>
                                <p
                                    class="text-xs leading-relaxed text-zinc-400"
                                >
                                    Pick your items, choose sizes, and add them
                                    to your cart. Adjust quantities before
                                    checkout.
                                </p>
                            </div>
                        </div>

                        <div
                            class="ml-7 h-6 w-px bg-linear-to-b from-blue-500/30 to-transparent"
                            aria-hidden="true"
                        ></div>

                        <!-- Step 3 -->
                        <div
                            class="reveal-step flex items-start gap-5 opacity-0"
                        >
                            <div class="relative shrink-0">
                                <div
                                    class="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/15 ring-1 ring-blue-500/30"
                                >
                                    <CheckIcon class="h-6 w-6 text-blue-400" />
                                </div>
                                <span
                                    class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white"
                                    aria-hidden="true">3</span
                                >
                            </div>
                            <div class="pt-1">
                                <h3
                                    class="mb-1.5 text-sm font-semibold text-zinc-100"
                                >
                                    Place Your Order
                                </h3>
                                <p
                                    class="text-xs leading-relaxed text-zinc-400"
                                >
                                    Fill in your details, upload proof of
                                    payment, and submit. We'll take it from
                                    there with love.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- ===== WHY CHOOSE US ===== -->
    <section class="py-24">
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
                        class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10"
                    >
                        <FlameIcon class="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 class="mb-1 text-sm font-semibold text-zinc-100">
                        Fresh Daily
                    </h3>
                    <p class="text-xs leading-relaxed text-zinc-500">
                        Cooked fresh on the day of your order — never
                        pre-packaged.
                    </p>
                </div>

                <div
                    class="reveal-feature rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 opacity-0 transition-colors hover:border-zinc-700"
                >
                    <div
                        class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10"
                    >
                        <StarIcon class="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 class="mb-1 text-sm font-semibold text-zinc-100">
                        Authentic Flavors
                    </h3>
                    <p class="text-xs leading-relaxed text-zinc-500">
                        Time-honoured recipes passed down through generations.
                    </p>
                </div>

                <div
                    class="reveal-feature rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 opacity-0 transition-colors hover:border-zinc-700"
                >
                    <div
                        class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10"
                    >
                        <HeartIcon class="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 class="mb-1 text-sm font-semibold text-zinc-100">
                        Made with Love
                    </h3>
                    <p class="text-xs leading-relaxed text-zinc-500">
                        Every bilao, every plate is prepared with care — just
                        like home.
                    </p>
                </div>

                <div
                    class="reveal-feature rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 opacity-0 transition-colors hover:border-zinc-700"
                >
                    <div
                        class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10"
                    >
                        <PackageSearchIcon class="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 class="mb-1 text-sm font-semibold text-zinc-100">
                        Live Tracking
                    </h3>
                    <p class="text-xs leading-relaxed text-zinc-500">
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
                        class="mx-auto mb-5 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-white/10"
                    >
                        <img
                            src={logoImg}
                            alt="Cosina Ni Cacai"
                            class="h-full w-full object-cover"
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
                            class="h-4 w-4 transition-transform group-hover:translate-x-0.5"
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
                    class="h-8 w-8 rounded-lg object-cover"
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
