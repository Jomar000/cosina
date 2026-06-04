<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import { cn } from '@hyperion/ui/utils'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'

    ////////////////////
    // 01. Properties //
    ////////////////////

    type TSize = { id: number; name: string; price: string }

    type TProduct = {
        id: number
        name: string
        ingredients: string | null
        category: 'bilao_package' | 'bundle_package' | 'single_order'
        price: string
        imageUrl: string | null
        sizes: TSize[]
    }

    type TCartItem = {
        productId: number
        name: string
        sizeName?: string
        quantity: number
        price: string
        imageUrl?: string | null
    }

    let {
        product,
        onAddToCart,
    }: {
        product: TProduct
        onAddToCart: (item: TCartItem) => void
    } = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const CATEGORY_LABELS: Record<TProduct['category'], string> = {
        bilao_package: 'Bilao Package',
        bundle_package: 'Bundle Package',
        single_order: 'Single Order',
    }

    const CATEGORY_COLORS: Record<TProduct['category'], string> = {
        bilao_package: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        bundle_package: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        single_order: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    }

    ///////////////
    // 03. State //
    ///////////////

    let selectedSizeId = $state<number | null>(null)

    /////////////////
    // 04. Derived //
    /////////////////

    const selectedSize = $derived(
        product.sizes.find((s) => s.id === selectedSizeId) ?? null,
    )

    const displayPrice = $derived(selectedSize?.price ?? product.price)

    /////////////////
    // 08. Effects //
    /////////////////

    $effect.pre(() => {
        if (selectedSizeId === null && product.sizes.length > 0) {
            selectedSizeId = product.sizes[0].id
        }
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    function handleAddToCart() {
        onAddToCart({
            productId: product.id,
            name: product.name,
            sizeName: selectedSize?.name,
            quantity: 1,
            price: displayPrice,
            imageUrl: product.imageUrl,
        })
    }
</script>

<div
    class="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5"
>
    <!-- Product Image -->
    <div class="relative aspect-4/3 overflow-hidden bg-zinc-800">
        {#if product.imageUrl}
            <img
                src={product.imageUrl}
                alt={product.name}
                class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
            />
        {:else}
            <div
                class="flex h-full w-full items-center justify-center text-zinc-600"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-12 w-12 opacity-40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M9 13h6M9 17h3m-3-8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
                    />
                </svg>
            </div>
        {/if}
        <!-- Category Badge -->
        <div class="absolute top-3 left-3">
            <span
                class={cn(
                    'rounded-full border px-2.5 py-1 text-xs font-medium',
                    CATEGORY_COLORS[product.category],
                )}
            >
                {CATEGORY_LABELS[product.category]}
            </span>
        </div>
    </div>

    <!-- Card Body -->
    <div class="flex flex-1 flex-col gap-3 p-4">
        <div class="flex-1">
            <h3 class="text-base font-semibold text-zinc-100 leading-tight">
                {product.name}
            </h3>
            {#if product.ingredients}
                <p class="mt-1 line-clamp-2 text-xs text-zinc-500">
                    {product.ingredients}
                </p>
            {/if}
        </div>

        <!-- Size Selector -->
        {#if product.sizes.length > 0}
            <div class="flex flex-wrap gap-1.5">
                {#each product.sizes as size (size.id)}
                    <button
                        type="button"
                        class={cn(
                            'rounded-lg border px-2.5 py-1 text-xs font-medium transition-all',
                            selectedSizeId === size.id
                                ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                        )}
                        onclick={() => (selectedSizeId = size.id)}
                    >
                        {size.name}
                    </button>
                {/each}
            </div>
        {/if}

        <!-- Price + Add to Cart -->
        <div class="flex items-center justify-between gap-2">
            <div>
                <span class="text-xl font-bold text-blue-400">
                    ₱{Number(displayPrice).toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </span>
            </div>
            <Button
                size="sm"
                onclick={handleAddToCart}
                class="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700"
            >
                <ShoppingCartIcon class="h-3.5 w-3.5" />
                <span class="text-xs font-semibold">Add</span>
            </Button>
        </div>
    </div>
</div>
