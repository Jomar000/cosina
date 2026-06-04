<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import { cn } from '@hyperion/ui/utils'
    import type { TApiResponse } from '@hyperion/types/shared'
    import PackageSearchIcon from '@lucide/svelte/icons/package-search'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import UtensilsIcon from '@lucide/svelte/icons/utensils'
    import { createQuery, useQueryClient } from '@tanstack/svelte-query'

    import { productClient } from '$lib/clients'
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
    let selectedCategory = $state<TCategory>('all')
    let nextKey = 0

    /////////////////
    // 04. Derived //
    /////////////////

    const cartItemCount = $derived(
        cart.reduce((sum, item) => sum + item.quantity, 0),
    )

    /////////////////
    // 05. Queries //
    /////////////////

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

    /////////////////
    // 10. Helpers //
    /////////////////

    function filteredProducts(products: TProduct[]): TProduct[] {
        if (selectedCategory === 'all') return products
        return products.filter((p) => p.category === selectedCategory)
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
</script>

<div class="min-h-dvh bg-zinc-950 text-zinc-100">
    <!-- Sticky Navigation -->
    <header
        class="sticky top-0 z-40 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md"
    >
        <div
            class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6"
        >
            <!-- Logo -->
            <div class="flex items-center gap-2.5">
                <div
                    class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600"
                >
                    <UtensilsIcon class="h-5 w-5 text-white" />
                </div>
                <div>
                    <h1 class="text-lg font-bold leading-none text-zinc-100">
                        Cosina
                    </h1>
                    <p class="mt-0.5 text-[10px] leading-none text-zinc-500">
                        Home-cooked meals
                    </p>
                </div>
            </div>

            <!-- Nav actions -->
            <div class="flex items-center gap-2">
                <a
                    href="/track"
                    class="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2.5 text-sm font-medium text-zinc-400 transition-all hover:border-zinc-700 hover:text-zinc-200"
                >
                    <PackageSearchIcon class="h-4 w-4" />
                    <span class="hidden sm:inline">Track Order</span>
                </a>

                <!-- Cart Button -->
                <button
                    type="button"
                    onclick={() => (cartOpen = true)}
                    class="relative flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-blue-500/40 hover:text-zinc-100"
                >
                    <ShoppingCartIcon class="h-4 w-4" />
                    <span class="hidden sm:inline">Cart</span>
                    {#if cartItemCount > 0}
                        <span
                            class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white"
                        >
                            {cartItemCount > 99 ? '99+' : cartItemCount}
                        </span>
                    {/if}
                </button>
            </div>
        </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <!-- Hero Section -->
        <section class="py-10 sm:py-14">
            <div class="text-center">
                <div
                    class="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5"
                >
                    <span class="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
                    <span class="text-xs font-medium text-blue-400"
                        >Order Online • Fresh Daily</span
                    >
                </div>
                <h2
                    class="text-3xl font-bold tracking-tight text-zinc-100 sm:text-4xl md:text-5xl"
                >
                    Authentic Filipino
                    <span
                        class="bg-linear-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent"
                    >
                        Home Cooking
                    </span>
                </h2>
                <p
                    class="mx-auto mt-4 max-w-md text-sm text-zinc-400 sm:text-base"
                >
                    Order from our curated selection of bilao packages, bundle
                    deals, and à la carte items — all made with love.
                </p>
            </div>
        </section>

        <!-- Category Filter -->
        <section class="mb-8">
            <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {#each CATEGORIES as cat (cat.value)}
                    <button
                        type="button"
                        class={cn(
                            'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-all',
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
            {#if productsQuery.isPending}
                <div
                    class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
                >
                    {#each Array.from({ length: 6 }, (_, k) => k) as i (i)}
                        <div
                            class="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                        >
                            <div
                                class="aspect-4/3 animate-pulse bg-zinc-800"
                            ></div>
                            <div class="flex flex-col gap-3 p-4">
                                <div
                                    class="h-4 w-3/4 animate-pulse rounded-md bg-zinc-800"
                                ></div>
                                <div
                                    class="h-3 w-full animate-pulse rounded-md bg-zinc-800"
                                ></div>
                                <div class="flex justify-between">
                                    <div
                                        class="h-6 w-20 animate-pulse rounded-md bg-zinc-800"
                                    ></div>
                                    <div
                                        class="h-8 w-16 animate-pulse rounded-lg bg-zinc-800"
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
                        <UtensilsIcon class="h-12 w-12 text-zinc-700" />
                        <p class="text-sm text-zinc-500">
                            No items in this category right now.
                        </p>
                    </div>
                {:else}
                    <div
                        class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {#each products as product (product.id)}
                            <ProductCard
                                {product}
                                onAddToCart={(item) => {
                                    addToCart(item)
                                    cartOpen = true
                                }}
                            />
                        {/each}
                    </div>
                {/if}
            {/if}
        </section>
    </main>

    <!-- Floating Cart Button (mobile sticky) -->
    {#if cartItemCount > 0 && !cartOpen}
        <div class="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 sm:hidden">
            <button
                type="button"
                onclick={() => (cartOpen = true)}
                class="flex items-center gap-3 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
                <ShoppingCartIcon class="h-4 w-4" />
                View Cart ({cartItemCount})
                <span class="font-bold">
                    ₱{cart
                        .reduce(
                            (sum, i) => sum + parseFloat(i.price) * i.quantity,
                            0,
                        )
                        .toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                </span>
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
        onOrderSuccess={handleOrderSuccess}
    />
</div>
