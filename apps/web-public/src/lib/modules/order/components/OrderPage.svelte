<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import * as Dialog from '@hyperion/ui/components/dialog'
    import * as Drawer from '@hyperion/ui/components/drawer'
    import { cn } from '@hyperion/ui/utils'
    import type { TApiResponse } from '@hyperion/types/shared'
    import BookOpenCheckIcon from '@lucide/svelte/icons/book-open-check'
    import CalendarDaysIcon from '@lucide/svelte/icons/calendar-days'
    import CheckIcon from '@lucide/svelte/icons/check'
    import UtensilsCrossedIcon from '@lucide/svelte/icons/utensils-crossed'
    import DiscIcon from '@lucide/svelte/icons/disc'
    import LayoutGridIcon from '@lucide/svelte/icons/layout-grid'
    import PackageIcon from '@lucide/svelte/icons/package'
    import PackageSearchIcon from '@lucide/svelte/icons/package-search'
    import SearchIcon from '@lucide/svelte/icons/search'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import SlidersHorizontalIcon from '@lucide/svelte/icons/sliders-horizontal'
    import UtensilsIcon from '@lucide/svelte/icons/utensils'
    import XIcon from '@lucide/svelte/icons/x'
    import { onMount } from 'svelte'
    import { createQuery, useQueryClient } from '@tanstack/svelte-query'

    import { orderClient, productClient } from '$lib/clients'
    import { wsClientManager } from '$lib/utilities/wsClientManager'
    import type { TCartItem, TProduct, TProductTag } from '../types.js'
    import CartPanel from './CartPanel.svelte'
    import HowToOrderDialog from './HowToOrderDialog.svelte'
    import OrderForm from './OrderForm.svelte'
    import ProductCard from './ProductCard.svelte'
    import { IMG_logo } from '$lib/assets/image/index.js'

    ///////////////////
    // 02. Constants //
    ///////////////////

    type TCategory = 'all' | 'bilao_package' | 'bundle_package' | 'single_order'

    const TAG_LABELS: Record<TProductTag, string> = {
        new: 'New',
        best_seller: 'Best Seller',
        seasonal: 'Seasonal',
        limited: 'Limited',
    }

    const TAG_OPTIONS: TProductTag[] = [
        'new',
        'best_seller',
        'seasonal',
        'limited',
    ]

    const CATEGORIES = [
        { value: 'all' as TCategory, label: 'All Items', icon: LayoutGridIcon },
        {
            value: 'bilao_package' as TCategory,
            label: 'Bilao Package',
            icon: DiscIcon,
        },
        {
            value: 'bundle_package' as TCategory,
            label: 'Bundle Package',
            icon: PackageIcon,
        },
        {
            value: 'single_order' as TCategory,
            label: 'Single Order',
            icon: UtensilsIcon,
        },
    ]

    ///////////////
    // 03. State //
    ///////////////

    const queryClient = useQueryClient()

    let cart = $state<TCartItem[]>([])
    let cartOpen = $state(false)
    let filterDrawerOpen = $state(false)
    let orderFormOpen = $state(false)
    let productSectionEl = $state<HTMLElement | null>(null)
    let searchQuery = $state('')
    let selectedCategory = $state<TCategory>('all')
    let selectedTag = $state<TProductTag | 'all'>('all')
    let nextKey = 0
    let closedDialogDismissed = $state(false)
    let closedDialogOpen = $state(false)
    let howToOrderOpen = $state(false)

    /////////////////
    // 05. Queries //
    /////////////////

    type TClosingDayItem = {
        id: string
        startDate: string
        endDate: string
        reason?: string
    }

    const settingsQuery = createQuery(() => ({
        queryKey: [
            'order',
            'settings',
        ],
        queryFn: async () => {
            const response = await orderClient.settings.$get()
            const json = (await response.json()) as TApiResponse<{
                advanceDays: number
                restaurantAddress: string | null
                closingDays: TClosingDayItem[]
                gcashAccountName: string | null
                gcashNumber: string | null
                paymentInstructions: string | null
            }>
            if (!json.success) throw new Error(json.error.message)
            return json.data
        },
        staleTime: 0,
    }))

    /////////////////
    // 04. Derived //
    /////////////////

    const cartItemCount = $derived(
        cart.reduce((sum, item) => sum + item.quantity, 0),
    )

    const activeFilterCount = $derived(
        (selectedCategory !== 'all' ? 1 : 0) + (selectedTag !== 'all' ? 1 : 0),
    )

    const advanceDays = $derived(settingsQuery.data?.advanceDays ?? 3)
    const restaurantAddress = $derived(
        settingsQuery.data?.restaurantAddress ?? null,
    )
    const closingDays = $derived<TClosingDayItem[]>(
        settingsQuery.data?.closingDays ?? [],
    )

    const activeClosingRange = $derived.by(() => {
        const toDateStr = (d: Date) =>
            [
                d.getFullYear(),
                String(d.getMonth() + 1).padStart(2, '0'),
                String(d.getDate()).padStart(2, '0'),
            ].join('-')
        const today = new Date()
        const todayStr = toDateStr(today)
        const lookaheadStr = toDateStr(
            new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
        )
        return (
            closingDays.find(
                (r) => r.endDate >= todayStr && r.startDate <= lookaheadStr,
            ) ?? null
        )
    })

    const productsQuery = createQuery(() => ({
        queryKey: ['products'],
        queryFn: async () => {
            const response = await productClient.readMany.$get({
                query: { limit: '100', offset: '0', sortOrder: 'asc' },
            })
            const { data, error, success } =
                (await response.json()) as TApiResponse<TProduct[]>
            if (!success) throw new Error(error.message)
            return data
        },
    }))

    /////////////////
    // 08. Effects //
    /////////////////

    onMount(() => {
        closedDialogDismissed = false
    })

    $effect(() => {
        if (activeClosingRange && !closedDialogDismissed) {
            closedDialogOpen = true
        }
    })

    $effect(() => {
        const ws = wsClientManager.connect('products')

        function handleMessage() {
            queryClient.invalidateQueries({ queryKey: ['products'] })
        }

        ws.addEventListener('message', handleMessage)

        return () => {
            ws.removeEventListener('message', handleMessage)
            ws.release()
        }
    })

    $effect(() => {
        const ws = wsClientManager.connect('settings')

        function handleMessage(event: MessageEvent) {
            try {
                const { event: eventType, data } = JSON.parse(event.data)
                if (eventType === 'settings.update') {
                    queryClient.setQueryData(
                        [
                            'order',
                            'settings',
                        ],
                        (
                            current:
                                | {
                                      advanceDays: number
                                      restaurantAddress: string | null
                                      closingDays: TClosingDayItem[]
                                  }
                                | undefined,
                        ) => ({
                            advanceDays:
                                typeof data?.advanceDays === 'number'
                                    ? data.advanceDays
                                    : (current?.advanceDays ?? 3),
                            restaurantAddress:
                                'restaurantAddress' in data
                                    ? (data.restaurantAddress as string | null)
                                    : (current?.restaurantAddress ?? null),
                            closingDays: Array.isArray(data?.closingDays)
                                ? (data.closingDays as TClosingDayItem[])
                                : (current?.closingDays ?? []),
                        }),
                    )
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

    function selectCategory(cat: TCategory) {
        selectedCategory = cat
        if (productSectionEl) {
            const offset =
                productSectionEl.getBoundingClientRect().top +
                window.scrollY -
                190
            window.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' })
        }
    }

    function dismissClosedDialog() {
        closedDialogDismissed = true
        closedDialogOpen = false
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function formatClosingRange(startDate: string, endDate: string): string {
        const fmt = (s: string) => {
            const [
                y,
                m,
                d,
            ] = s.split('-').map(Number)
            return new Intl.DateTimeFormat('en-PH', {
                dateStyle: 'long',
            }).format(new Date(y, m - 1, d))
        }
        return startDate === endDate
            ? fmt(startDate)
            : `${fmt(startDate)} – ${fmt(endDate)}`
    }

    function filteredProducts(products: TProduct[]): TProduct[] {
        let result =
            selectedCategory === 'all'
                ? products
                : products.filter((p) => p.category === selectedCategory)

        if (selectedTag !== 'all') {
            result = result.filter((p) =>
                p.tags.includes(selectedTag as TProductTag),
            )
        }

        const query = searchQuery.trim().toLowerCase()
        if (query) {
            result = result.filter(
                (p) =>
                    p.name.toLowerCase().includes(query) ||
                    (p.ingredients?.toLowerCase().includes(query) ?? false),
            )
        }

        return result
    }

    function addToCart(item: Omit<TCartItem, 'key'>) {
        const existingIdx = cart.findIndex(
            (c) =>
                c.productId === item.productId &&
                c.sizeName === item.sizeName &&
                c.flavorName === item.flavorName,
        )
        if (existingIdx !== -1) {
            cart = cart.map((c, i) =>
                i === existingIdx
                    ? { ...c, quantity: Math.min(c.quantity + 1, 100) }
                    : c,
            )
        } else {
            cart = [
                ...cart,
                { ...item, key: nextKey++ },
            ]
        }
    }

    function handleOrderSuccess() {
        cart = []
    }

    function getProductCartQuantity(productId: number): number {
        return cart
            .filter((c) => c.productId === productId)
            .reduce((sum, c) => sum + c.quantity, 0)
    }
</script>

<div class="min-h-dvh bg-zinc-950 text-zinc-100">
    <!-- Sticky Navigation -->
    <header
        class="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md"
    >
        <div
            class="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 sm:px-6"
        >
            <!-- Logo -->
            <a
                href="/"
                class="flex items-center gap-2"
            >
                <div
                    class="flex size-9 items-center justify-center rounded-full"
                >
                    <img
                        src={IMG_logo}
                        alt="Cosina logo"
                        class="w-full rounded-full"
                    />
                </div>
                <div>
                    <h1 class="text-sm font-bold leading-none text-zinc-100">
                        Cosina
                    </h1>
                    <p class="mt-0.5 text-[9px] leading-none text-zinc-500">
                        Home-cooked meals
                    </p>
                </div>
            </a>

            <!-- Nav actions -->
            <div class="flex items-center gap-1.5">
                <button
                    type="button"
                    onclick={() => (howToOrderOpen = true)}
                    class="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:border-blue-500/40 hover:text-blue-300"
                >
                    <BookOpenCheckIcon class="size-3.5 " />
                    <span class="hidden sm:inline">How to Order?</span>
                </button>
                <a
                    href="/track"
                    class="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:border-zinc-700 hover:text-zinc-200"
                >
                    <PackageSearchIcon class="size-3.5 " />
                    <span class="hidden sm:inline">Track Order</span>
                </a>

                <!-- Cart Button -->
                <button
                    type="button"
                    onclick={() => (cartOpen = true)}
                    class={cn(
                        'relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                        cartItemCount > 0
                            ? 'border-blue-500/50 bg-blue-600/10 text-blue-400 hover:border-blue-500 hover:bg-blue-600/15'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-blue-500/40 hover:text-zinc-100',
                    )}
                >
                    <ShoppingCartIcon class="size-3.5 " />
                    <span class="hidden sm:inline">Cart</span>
                    {#if cartItemCount > 0}
                        <span
                            class="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white"
                        >
                            {cartItemCount > 99 ? '99+' : cartItemCount}
                        </span>
                    {/if}
                </button>
            </div>
        </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 pb-28 sm:pb-16 sm:px-6">
        <!-- Hero Section -->
        <section class="py-1.5 sm:py-3">
            <div class="text-center">
                <div
                    class="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1"
                >
                    <span class="size-1 rounded-full bg-blue-400"></span>
                    <span class="text-[11px] font-medium text-blue-400"
                        >Order Online • Fresh Daily</span
                    >
                </div>
                <h2
                    class="text-2xl font-bold tracking-tight text-zinc-100 sm:text-3xl"
                >
                    Authentic Filipino
                    <span
                        class="bg-linear-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent"
                    >
                        Home Cooking
                    </span>
                </h2>
                <p
                    class="mx-auto mt-1.5 max-w-md text-xs text-zinc-400 sm:text-sm"
                >
                    Bilao packages, bundle deals, and à la carte — made with
                    love.
                </p>
            </div>
        </section>

        <!-- Advance Notice Banner -->
        {#if !settingsQuery.isPending}
            <section class="mb-2 sm:mb-3">
                <div
                    class="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/8 px-3.5 py-3"
                >
                    <span
                        class="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400"
                        aria-hidden="true"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="size-2.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                            />
                            <line
                                x1="12"
                                y1="8"
                                x2="12"
                                y2="12"
                            />
                            <line
                                x1="12"
                                y1="16"
                                x2="12.01"
                                y2="16"
                            />
                        </svg>
                    </span>
                    <p class="text-xs/relaxed text-amber-300/80">
                        Orders must be placed at least
                        <strong class="font-semibold text-amber-300"
                            >{advanceDays}
                            {advanceDays === 1 ? 'day' : 'days'}</strong
                        > in advance. Plan ahead to secure your order.
                    </p>
                </div>
            </section>
        {/if}

        <!-- Sticky Search + Filter Bar -->
        <div
            class="sticky top-11 z-30 -mx-4 border-b border-zinc-800/50 bg-zinc-950/95 px-4 pb-3 pt-2 backdrop-blur-sm sm:-mx-6 sm:px-6"
        >
            <!-- Search + mobile filter button -->
            <div class="mb-2 flex gap-2 sm:mb-3">
                <div class="relative flex-1">
                    <SearchIcon
                        class="pointer-events-none absolute left-3 top-1/2 size-3.5  -translate-y-1/2 text-zinc-500"
                    />
                    <input
                        type="search"
                        placeholder="Search menu items..."
                        bind:value={searchQuery}
                        aria-label="Search menu items"
                        class="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 px-9 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                    />
                    {#if searchQuery}
                        <button
                            type="button"
                            onclick={() => (searchQuery = '')}
                            aria-label="Clear search"
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                        >
                            <XIcon class="size-3.5 " />
                        </button>
                    {/if}
                </div>

                <!-- Filter button — mobile only -->
                <button
                    type="button"
                    onclick={() => (filterDrawerOpen = true)}
                    aria-label="Open filters"
                    class={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 transition-all sm:hidden',
                        activeFilterCount > 0
                            ? 'border-blue-500/50 bg-blue-600/10 text-blue-400'
                            : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300',
                    )}
                >
                    <SlidersHorizontalIcon class="size-3.5 " />
                    {#if activeFilterCount > 0}
                        <span
                            class="flex size-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white"
                        >
                            {activeFilterCount}
                        </span>
                    {/if}
                </button>
            </div>

            <!-- Mobile: active filter chips -->
            {#if activeFilterCount > 0}
                <div
                    class="mb-2 flex gap-1.5 overflow-x-auto scrollbar-none sm:hidden"
                >
                    {#if selectedCategory !== 'all'}
                        {@const activeCat = CATEGORIES.find(
                            (c) => c.value === selectedCategory,
                        )}
                        <button
                            type="button"
                            onclick={() => (selectedCategory = 'all')}
                            class="flex shrink-0 items-center gap-1 rounded-full border border-blue-500/40 bg-blue-600/15 px-2.5 py-1 text-[11px] font-medium text-blue-400"
                        >
                            {activeCat?.label}
                            <XIcon class="size-3 " />
                        </button>
                    {/if}
                    {#if selectedTag !== 'all'}
                        <button
                            type="button"
                            onclick={() => (selectedTag = 'all')}
                            class="flex shrink-0 items-center gap-1 rounded-full border border-blue-500/40 bg-blue-600/15 px-2.5 py-1 text-[11px] font-medium text-blue-400"
                        >
                            {TAG_LABELS[selectedTag as TProductTag]}
                            <XIcon class="size-3 " />
                        </button>
                    {/if}
                </div>
            {/if}

            <!-- Desktop: Category + Tag filter pills -->
            <div class="hidden sm:block">
                <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {#each CATEGORIES as cat (cat.value)}
                        {@const Icon = cat.icon}
                        <button
                            type="button"
                            class={cn(
                                'flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all',
                                selectedCategory === cat.value
                                    ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300',
                            )}
                            onclick={() => selectCategory(cat.value)}
                        >
                            <Icon class="size-3  shrink-0" />
                            {cat.label}
                        </button>
                    {/each}
                </div>

                <div class="mt-2 flex items-center gap-2">
                    <span
                        class="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-600"
                        >Tag</span
                    >
                    <div
                        class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none"
                    >
                        <button
                            type="button"
                            class={cn(
                                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                                selectedTag === 'all'
                                    ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300',
                            )}
                            onclick={() => (selectedTag = 'all')}
                        >
                            All
                        </button>
                        {#each TAG_OPTIONS as tag (tag)}
                            <button
                                type="button"
                                class={cn(
                                    'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                                    selectedTag === tag
                                        ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                        : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300',
                                )}
                                onclick={() => (selectedTag = tag)}
                            >
                                {TAG_LABELS[tag]}
                            </button>
                        {/each}
                    </div>
                </div>
            </div>
        </div>

        <!-- Product Grid -->
        <section
            bind:this={productSectionEl}
            class="scroll-mt-32 pt-4 sm:scroll-mt-52"
        >
            {#if productsQuery.isFetching && !productsQuery.isPending}
                <div
                    class="mb-3 flex items-center gap-1.5 text-xs text-zinc-500"
                >
                    <div
                        class="size-3 animate-spin rounded-full border border-zinc-700 border-t-blue-400"
                    ></div>
                    Updating menu…
                </div>
            {/if}

            {#if productsQuery.isPending}
                <div
                    class="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-3"
                >
                    {#each Array.from({ length: 6 }, (_, k) => k) as i (i)}
                        <div
                            class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                        >
                            <div
                                class="aspect-4/3 animate-pulse bg-zinc-800"
                            ></div>
                            <div class="flex flex-col gap-2 p-3">
                                <div
                                    class="h-3.5 w-3/4 animate-pulse rounded-sm bg-zinc-800"
                                ></div>
                                <div
                                    class="h-3 w-full animate-pulse rounded-sm bg-zinc-800"
                                ></div>
                                <div class="flex justify-between">
                                    <div
                                        class="h-5 w-16 animate-pulse rounded-sm bg-zinc-800"
                                    ></div>
                                    <div
                                        class="h-7 w-14 animate-pulse rounded-lg bg-zinc-800"
                                    ></div>
                                </div>
                            </div>
                        </div>
                    {/each}
                </div>
            {:else if productsQuery.isError}
                <div
                    class="flex flex-col items-center justify-center gap-3 py-20 text-center"
                >
                    <p class="text-sm text-zinc-500">
                        Unable to load the menu. Please try again.
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => productsQuery.refetch()}
                        class="text-blue-400 hover:text-blue-300"
                    >
                        Retry
                    </Button>
                </div>
            {:else if productsQuery.data}
                {@const products = filteredProducts(productsQuery.data)}
                {#if products.length === 0}
                    <div
                        class="flex flex-col items-center justify-center gap-3 py-20 text-center"
                    >
                        {#if searchQuery.trim()}
                            <SearchIcon class="size-12  text-zinc-700" />
                            <p class="text-sm text-zinc-500">
                                No items match "<span class="text-zinc-400"
                                    >{searchQuery.trim()}</span
                                >"
                            </p>
                            <button
                                type="button"
                                onclick={() => (searchQuery = '')}
                                class="text-xs text-blue-400 transition-colors hover:text-blue-300"
                            >
                                Clear search
                            </button>
                        {:else}
                            <UtensilsIcon class="size-12  text-zinc-700" />
                            <p class="text-sm text-zinc-500">
                                {#if selectedTag !== 'all'}
                                    No items tagged "{TAG_LABELS[
                                        selectedTag as TProductTag
                                    ]}" right now.
                                {:else}
                                    No items in this category right now.
                                {/if}
                            </p>
                        {/if}
                    </div>
                {:else}
                    {#if searchQuery.trim() || selectedCategory !== 'all' || selectedTag !== 'all'}
                        <p class="mb-3 text-xs text-zinc-500">
                            {products.length}
                            {products.length === 1 ? 'item' : 'items'} found
                        </p>
                    {/if}
                    <div
                        class="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 sm:gap-4 lg:grid-cols-3"
                    >
                        {#each products as product (product.id)}
                            <ProductCard
                                {product}
                                cartQuantity={getProductCartQuantity(
                                    product.id,
                                )}
                                onAddToCart={(item) => addToCart(item)}
                            />
                        {/each}
                    </div>
                {/if}
            {/if}
        </section>
    </main>

    <!-- Floating Cart Button (mobile sticky) -->
    {#if cartItemCount > 0 && !cartOpen}
        <div
            class="fixed bottom-6 inset-x-0 z-30 flex justify-center px-5 sm:hidden"
        >
            <button
                type="button"
                onclick={() => (cartOpen = true)}
                class="flex w-full max-w-sm items-center overflow-hidden rounded-2xl bg-blue-600 shadow-2xl shadow-blue-600/40 transition-transform active:scale-[0.97]"
            >
                <!-- Cart icon with item-count badge -->
                <div
                    class="relative flex shrink-0 items-center justify-center p-3"
                >
                    <ShoppingCartIcon class="size-4  text-white" />
                    <span
                        class="absolute right-1.5 top-1.5 flex size-3.5 items-center justify-center rounded-full bg-white text-[8px] font-extrabold leading-none text-blue-600"
                    >
                        {cartItemCount > 99 ? '99+' : cartItemCount}
                    </span>
                </div>

                <!-- Label -->
                <span class="flex-1 text-left text-xs font-semibold text-white">
                    View Cart
                </span>

                <!-- Total price chip -->
                <div
                    class="m-1.5 flex items-center rounded-lg bg-white/15 px-3 py-2"
                >
                    <span class="tabular-nums text-xs font-bold text-white">
                        ₱{cart
                            .reduce(
                                (sum, i) =>
                                    sum + parseFloat(i.price) * i.quantity,
                                0,
                            )
                            .toLocaleString('en-PH', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}
                    </span>
                </div>
            </button>
        </div>
    {/if}

    <!-- Mobile Filter Drawer -->
    <Drawer.Root
        bind:open={filterDrawerOpen}
        shouldScaleBackground={false}
    >
        <Drawer.Content>
            <Drawer.Header class="pb-0">
                <Drawer.Title>Filters</Drawer.Title>
            </Drawer.Header>
            <div class="flex flex-col gap-5 px-4 pb-8 pt-2">
                <!-- Category -->
                <div>
                    <p
                        class="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500"
                    >
                        Category
                    </p>
                    <div class="flex flex-col">
                        {#each CATEGORIES as cat (cat.value)}
                            {@const Icon = cat.icon}
                            <button
                                type="button"
                                onclick={() => (selectedCategory = cat.value)}
                                class={cn(
                                    'flex min-h-12 w-full items-center gap-3 border-b border-zinc-800/60 px-1 py-3 text-left transition-colors last:border-b-0',
                                    selectedCategory === cat.value
                                        ? 'text-blue-400'
                                        : 'text-zinc-300 hover:text-zinc-100',
                                )}
                            >
                                <Icon class="size-4  shrink-0" />
                                <span class="flex-1 text-sm font-medium"
                                    >{cat.label}</span
                                >
                                <CheckIcon
                                    class={cn(
                                        'size-4  transition-opacity',
                                        selectedCategory === cat.value
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                    )}
                                />
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Tag -->
                <div>
                    <p
                        class="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500"
                    >
                        Tag
                    </p>
                    <div class="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onclick={() => (selectedTag = 'all')}
                            class={cn(
                                'rounded-full border px-3.5 py-2 text-xs font-medium transition-all',
                                selectedTag === 'all'
                                    ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                    : 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-zinc-600',
                            )}
                        >
                            All Tags
                        </button>
                        {#each TAG_OPTIONS as tag (tag)}
                            <button
                                type="button"
                                onclick={() => (selectedTag = tag)}
                                class={cn(
                                    'rounded-full border px-3.5 py-2 text-xs font-medium transition-all',
                                    selectedTag === tag
                                        ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                        : 'border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:border-zinc-600',
                                )}
                            >
                                {TAG_LABELS[tag]}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- Done -->
                <button
                    type="button"
                    onclick={() => (filterDrawerOpen = false)}
                    class="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 active:bg-blue-700"
                >
                    {#if activeFilterCount > 0}
                        Show results
                    {:else}
                        Done
                    {/if}
                </button>
            </div>
        </Drawer.Content>
    </Drawer.Root>

    <!-- Cart Panel -->
    <CartPanel
        bind:open={cartOpen}
        bind:cart
        onPlaceOrder={() => (orderFormOpen = true)}
    />

    <!-- Order Form -->
    <OrderForm
        bind:open={orderFormOpen}
        {cart}
        {advanceDays}
        {restaurantAddress}
        {closingDays}
        settingsLoading={settingsQuery.isPending}
        gcashAccountName={settingsQuery.data?.gcashAccountName ?? null}
        gcashNumber={settingsQuery.data?.gcashNumber ?? null}
        onOrderSuccess={handleOrderSuccess}
    />

    <!-- Restaurant Closed Dialog -->
    {#if activeClosingRange}
        <Dialog.Root
            bind:open={closedDialogOpen}
            onOpenChange={(open: boolean) => {
                if (!open) dismissClosedDialog()
            }}
        >
            <Dialog.Content
                class="max-w-sm gap-0 overflow-hidden border-zinc-800 bg-zinc-900 p-0 text-zinc-100"
            >
                <!-- Amber header band -->
                <div
                    class="flex flex-col items-center gap-3 bg-amber-500/10 px-6 py-8"
                >
                    <div
                        class="flex size-16 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/15"
                    >
                        <UtensilsCrossedIcon class="size-8  text-amber-400" />
                    </div>
                    <div class="flex flex-col items-center gap-1 text-center">
                        <Dialog.Title
                            class="text-base font-semibold text-zinc-100"
                        >
                            We're Temporarily Closed
                        </Dialog.Title>
                        <Dialog.Description
                            class="text-xs/relaxed  text-zinc-400"
                        >
                            Cosina is not accepting orders during this period.
                        </Dialog.Description>
                    </div>
                </div>

                <!-- Date range detail -->
                <div class="flex flex-col gap-4 px-6 py-5">
                    <div
                        class="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
                    >
                        <CalendarDaysIcon
                            class="mt-0.5 size-4  shrink-0 text-amber-400"
                        />
                        <div class="flex flex-col gap-0.5">
                            <p class="text-sm font-semibold text-amber-300">
                                {formatClosingRange(
                                    activeClosingRange.startDate,
                                    activeClosingRange.endDate,
                                )}
                            </p>
                            {#if activeClosingRange.reason}
                                <p class="text-xs text-zinc-400">
                                    {activeClosingRange.reason}
                                </p>
                            {/if}
                        </div>
                    </div>

                    <p class="text-center text-xs/relaxed text-zinc-500">
                        You can still browse our menu and place orders for dates
                        outside this period.
                    </p>
                </div>

                <!-- Footer -->
                <div class="border-t border-zinc-800 px-6 py-4">
                    <Button
                        class="w-full"
                        onclick={dismissClosedDialog}
                    >
                        Got It
                    </Button>
                </div>
            </Dialog.Content>
        </Dialog.Root>
    {/if}
</div>

<HowToOrderDialog bind:open={howToOrderOpen} />
