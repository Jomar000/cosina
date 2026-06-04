<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import { cn } from '@hyperion/ui/utils'
    import type { TApiResponse } from '@hyperion/types/shared'
    import PackageSearchIcon from '@lucide/svelte/icons/package-search'
    import SearchIcon from '@lucide/svelte/icons/search'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import UtensilsIcon from '@lucide/svelte/icons/utensils'
    import XIcon from '@lucide/svelte/icons/x'
    import { createQuery, useQueryClient } from '@tanstack/svelte-query'

    import { orderClient, productClient } from '$lib/clients'
    import { wsClientManager } from '$lib/utilities/wsClientManager'
    import type { TCartItem, TProduct } from '../types.js'
    import CartPanel from './CartPanel.svelte'
    import OrderForm from './OrderForm.svelte'
    import ProductCard from './ProductCard.svelte'

    ///////////////////
    // 02. Constants //
    ///////////////////

    type TCategory = 'all' | 'bilao_package' | 'bundle_package' | 'single_order'

    const CATEGORIES: { value: TCategory; label: string }[] = [
        { value: 'all', label: 'All Items' },
        { value: 'bilao_package', label: 'Bilao Package' },
        { value: 'bundle_package', label: 'Bundle Package' },
        { value: 'single_order', label: 'Single Order' },
    ]

    ///////////////
    // 03. State //
    ///////////////

    const queryClient = useQueryClient()

    let cart = $state<TCartItem[]>([])
    let cartOpen = $state(false)
    let orderFormOpen = $state(false)
    let searchQuery = $state('')
    let selectedCategory = $state<TCategory>('all')
    let nextKey = 0

    /////////////////
    // 05. Queries //
    /////////////////

    const settingsQuery = createQuery(() => ({
        queryKey: [
            'order',
            'settings',
        ],
        queryFn: async () => {
            const response = await orderClient.settings.$get()
            const { data } = (await response.json()) as TApiResponse<{
                advanceDays: number
            }>
            return data!
        },
        staleTime: 5 * 60 * 1000,
    }))

    /////////////////
    // 04. Derived //
    /////////////////

    const cartItemCount = $derived(
        cart.reduce((sum, item) => sum + item.quantity, 0),
    )

    const advanceDays = $derived(settingsQuery.data?.advanceDays ?? 3)

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
                if (
                    eventType === 'settings.update' &&
                    typeof data?.advanceDays === 'number'
                ) {
                    queryClient.setQueryData(
                        [
                            'order',
                            'settings',
                        ],
                        data,
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

    /////////////////
    // 10. Helpers //
    /////////////////

    function filteredProducts(products: TProduct[]): TProduct[] {
        let result =
            selectedCategory === 'all'
                ? products
                : products.filter((p) => p.category === selectedCategory)

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
                c.productId === item.productId && c.sizeName === item.sizeName,
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
            <div class="flex items-center gap-2">
                <div
                    class="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600"
                >
                    <UtensilsIcon class="h-4 w-4 text-white" />
                </div>
                <div>
                    <h1 class="text-sm font-bold leading-none text-zinc-100">
                        Cosina
                    </h1>
                    <p class="mt-0.5 text-[9px] leading-none text-zinc-500">
                        Home-cooked meals
                    </p>
                </div>
            </div>

            <!-- Nav actions -->
            <div class="flex items-center gap-1.5">
                <a
                    href="/track"
                    class="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-400 transition-all hover:border-zinc-700 hover:text-zinc-200"
                >
                    <PackageSearchIcon class="h-3.5 w-3.5" />
                    <span class="hidden sm:inline">Track Order</span>
                </a>

                <!-- Cart Button -->
                <button
                    type="button"
                    onclick={() => (cartOpen = true)}
                    class="relative flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all hover:border-blue-500/40 hover:text-zinc-100"
                >
                    <ShoppingCartIcon class="h-3.5 w-3.5" />
                    <span class="hidden sm:inline">Cart</span>
                    {#if cartItemCount > 0}
                        <span
                            class="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[9px] font-bold text-white"
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
        <section class="py-4 sm:py-6">
            <div class="text-center">
                <div
                    class="mb-2 inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1"
                >
                    <span class="h-1 w-1 rounded-full bg-blue-400"></span>
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

        <!-- Search Bar -->
        <section class="mb-3">
            <div class="relative">
                <SearchIcon
                    class="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                />
                <input
                    type="search"
                    placeholder="Search menu items..."
                    bind:value={searchQuery}
                    aria-label="Search menu items"
                    class="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-9 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20"
                />
                {#if searchQuery}
                    <button
                        type="button"
                        onclick={() => (searchQuery = '')}
                        aria-label="Clear search"
                        class="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                        <XIcon class="h-3.5 w-3.5" />
                    </button>
                {/if}
            </div>
        </section>

        <!-- Category Filter -->
        <section class="mb-4">
            <!-- Mobile: 2×2 grid | sm+: horizontal scrollable row -->
            <div
                class="grid grid-cols-2 gap-1.5 sm:flex sm:flex-nowrap sm:gap-2 sm:overflow-x-auto sm:pb-1"
            >
                {#each CATEGORIES as cat (cat.value)}
                    <button
                        type="button"
                        class={cn(
                            'rounded-lg border px-3 py-2 text-xs font-medium transition-all sm:shrink-0 sm:rounded-full sm:px-3.5 sm:py-1.5',
                            selectedCategory === cat.value
                                ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300',
                        )}
                        onclick={() => (selectedCategory = cat.value)}
                    >
                        {cat.label}
                    </button>
                {/each}
            </div>
        </section>

        <!-- Product Grid -->
        <section>
            {#if productsQuery.isFetching && !productsQuery.isPending}
                <div
                    class="mb-3 flex items-center gap-1.5 text-xs text-zinc-500"
                >
                    <div
                        class="h-3 w-3 animate-spin rounded-full border border-zinc-700 border-t-blue-400"
                    ></div>
                    Updating menu…
                </div>
            {/if}

            {#if productsQuery.isPending}
                <div
                    class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
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
                                    class="h-3.5 w-3/4 animate-pulse rounded bg-zinc-800"
                                ></div>
                                <div
                                    class="h-3 w-full animate-pulse rounded bg-zinc-800"
                                ></div>
                                <div class="flex justify-between">
                                    <div
                                        class="h-5 w-16 animate-pulse rounded bg-zinc-800"
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
                            <SearchIcon class="h-12 w-12 text-zinc-700" />
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
                            <UtensilsIcon class="h-12 w-12 text-zinc-700" />
                            <p class="text-sm text-zinc-500">
                                No items in this category right now.
                            </p>
                        {/if}
                    </div>
                {:else}
                    <div
                        class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
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
            class="fixed bottom-6 left-0 right-0 z-30 flex justify-center px-5 sm:hidden"
        >
            <button
                type="button"
                onclick={() => (cartOpen = true)}
                class="flex w-full max-w-sm items-center overflow-hidden rounded-2xl bg-blue-600 shadow-2xl shadow-blue-600/40 transition-transform active:scale-[0.97]"
            >
                <!-- Cart icon with item-count badge -->
                <div
                    class="relative flex shrink-0 items-center justify-center px-3 py-3"
                >
                    <ShoppingCartIcon class="h-4 w-4 text-white" />
                    <span
                        class="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[8px] font-extrabold leading-none text-blue-600"
                    >
                        {cartItemCount > 9 ? '9+' : cartItemCount}
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
        settingsLoading={settingsQuery.isPending}
        onOrderSuccess={handleOrderSuccess}
    />
</div>
