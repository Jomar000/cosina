<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import { cn } from '@hyperion/ui/utils'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import UtensilsIcon from '@lucide/svelte/icons/utensils'

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
        cartQuantity = 0,
        onAddToCart,
    }: {
        product: TProduct
        cartQuantity?: number
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
    class="group flex flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-all duration-300 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5"
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
                class="flex h-full w-full flex-col items-center justify-center gap-1.5 text-zinc-700"
            >
                <UtensilsIcon class="h-10 w-10 opacity-30" />
                <span class="text-[10px] font-medium opacity-40">No photo</span>
            </div>
        {/if}
        <!-- Category Badge -->
        <div class="absolute top-2 left-2">
            <span
                class={cn(
                    'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                    CATEGORY_COLORS[product.category],
                )}
            >
                {CATEGORY_LABELS[product.category]}
            </span>
        </div>

        <!-- Cart quantity indicator -->
        {#if cartQuantity > 0}
            <div class="absolute right-2 top-2 z-10">
                <span
                    class="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white shadow ring-2 ring-zinc-900"
                >
                    {cartQuantity > 99 ? '99+' : cartQuantity}
                </span>
            </div>
        {/if}
    </div>

    <!-- Card Body -->
    <div class="flex flex-1 flex-col gap-2 p-3">
        <div class="flex-1">
            <h3 class="text-sm font-semibold leading-tight text-zinc-100">
                {product.name}
            </h3>
            {#if product.ingredients}
                <p
                    class="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500"
                >
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
                            'flex min-h-11 flex-col items-center justify-center rounded border px-3 py-1 transition-all sm:min-h-0 sm:py-0.5',
                            selectedSizeId === size.id
                                ? 'border-blue-500 bg-blue-500/15 text-blue-400'
                                : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600',
                        )}
                        onclick={() => (selectedSizeId = size.id)}
                    >
                        <span class="text-xs font-medium">{size.name}</span>
                        <span
                            class="tabular-nums text-[10px] leading-tight opacity-70"
                        >
                            ₱{Number(size.price).toLocaleString('en-PH', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            })}
                        </span>
                    </button>
                {/each}
            </div>
        {/if}

        <!-- Price + Add to Cart -->
        <div class="flex items-center justify-between gap-2">
            <span class="text-base font-bold tabular-nums text-blue-400">
                ₱{Number(displayPrice).toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                })}
            </span>
            <Button
                size="sm"
                onclick={handleAddToCart}
                class="h-11 gap-1.5 bg-blue-600 px-4 text-white hover:bg-blue-500 active:bg-blue-700 sm:h-8 sm:px-2.5"
            >
                <ShoppingCartIcon class="h-4 w-4 sm:h-3 sm:w-3" />
                <span class="text-sm font-semibold sm:text-[11px]">Add</span>
            </Button>
        </div>
    </div>
</div>
