<script lang="ts">
    import { Button } from '@cosina/ui/components/button'
    import * as Drawer from '@cosina/ui/components/drawer'
    import { cn } from '@cosina/ui/utils'
    import CheckIcon from '@lucide/svelte/icons/check'
    import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import UtensilsIcon from '@lucide/svelte/icons/utensils'

    ////////////////////
    // 01. Properties //
    ////////////////////

    type TFlavor = { id: number; name: string }
    type TSize = { id: number; name: string; price: string }

    type TTag = 'new' | 'best_seller' | 'seasonal' | 'limited'

    type TProduct = {
        id: number
        name: string
        ingredients: string | null
        category: 'bilao_package' | 'bundle_package' | 'single_order'
        price: string
        imageUrl: string | null
        tags: TTag[]
        flavors: TFlavor[]
        sizes: TSize[]
    }

    type TCartItem = {
        productId: number
        name: string
        sizeName?: string
        flavorName?: string
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

    const TAG_LABELS: Record<TTag, string> = {
        new: 'New',
        best_seller: 'Best Seller',
        seasonal: 'Seasonal',
        limited: 'Limited',
    }

    const TAG_COLORS: Record<TTag, string> = {
        new: 'bg-green-500',
        best_seller: 'bg-orange-500',
        seasonal: 'bg-sky-500',
        limited: 'bg-rose-500',
    }

    ///////////////
    // 03. State //
    ///////////////

    let selectedSizeId = $state<number | null>(null)
    let selectedFlavorId = $state<number | null>(null)
    let sizeDrawerOpen = $state(false)
    let flavorDrawerOpen = $state(false)

    /////////////////
    // 04. Derived //
    /////////////////

    const selectedSize = $derived(
        product.sizes.find((s) => s.id === selectedSizeId) ?? null,
    )

    const selectedFlavor = $derived(
        product.flavors.find((f) => f.id === selectedFlavorId) ?? null,
    )

    const displayPrice = $derived(selectedSize?.price ?? product.price)

    /////////////////
    // 08. Effects //
    /////////////////

    $effect.pre(() => {
        if (selectedSizeId === null && product.sizes.length > 0) {
            selectedSizeId = product.sizes[0].id
        }
        if (selectedFlavorId === null && product.flavors.length > 0) {
            selectedFlavorId = product.flavors[0].id
        }
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    function selectSize(sizeId: number) {
        selectedSizeId = sizeId
        sizeDrawerOpen = false
    }

    function selectFlavor(flavorId: number) {
        selectedFlavorId = flavorId
        flavorDrawerOpen = false
    }

    function handleAddToCart() {
        onAddToCart({
            productId: product.id,
            name: product.name,
            sizeName: selectedSize?.name,
            flavorName: selectedFlavor?.name,
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
                class="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
            />
        {:else}
            <div
                class="flex size-full flex-col items-center justify-center gap-2"
            >
                <UtensilsIcon class="size-8  text-zinc-600" />
                <span class="text-[10px] font-medium text-zinc-600"
                    >No photo</span
                >
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
                    class="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-[9px] font-bold text-white shadow-sm ring-2 ring-zinc-900"
                >
                    {cartQuantity > 99 ? '99+' : cartQuantity}
                </span>
            </div>
        {/if}
    </div>

    <!-- Card Body -->
    <div class="flex flex-1 flex-col gap-2 p-3">
        <div class="flex-1">
            <h3 class="text-sm/tight font-semibold text-zinc-100">
                {product.name}
            </h3>
            {#if product.tags.length > 0}
                <div class="mt-1 flex flex-wrap gap-1">
                    {#each product.tags as tag (tag)}
                        <span
                            class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white {TAG_COLORS[
                                tag
                            ]}"
                        >
                            {TAG_LABELS[tag]}
                        </span>
                    {/each}
                </div>
            {/if}
            {#if product.ingredients}
                <p
                    class="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-zinc-500"
                >
                    {product.ingredients}
                </p>
            {/if}
        </div>

        <!-- Flavor Selector -->
        {#if product.flavors.length === 1}
            <div
                class="flex items-center gap-1.5 rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2"
            >
                <span
                    class="text-[10px] font-semibold uppercase tracking-wide text-amber-400/70"
                    >Flavor</span
                >
                <span class="text-xs font-medium text-amber-300"
                    >{product.flavors[0].name}</span
                >
            </div>
        {:else if product.flavors.length > 1}
            <Drawer.Root
                bind:open={flavorDrawerOpen}
                shouldScaleBackground={false}
            >
                <Drawer.Trigger
                    class={cn(
                        'flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left transition-colors',
                        'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15',
                    )}
                >
                    <div class="flex min-w-0 items-center gap-1.5">
                        <span
                            class="text-[10px] font-semibold uppercase tracking-wide text-amber-400/70"
                            >Flavor</span
                        >
                        <span
                            class="truncate text-xs font-medium text-amber-300"
                            >{selectedFlavor?.name}</span
                        >
                    </div>
                    <ChevronDownIcon
                        class={cn(
                            'size-3.5  shrink-0 text-amber-400 transition-transform duration-200',
                            flavorDrawerOpen && 'rotate-180',
                        )}
                    />
                </Drawer.Trigger>
                <Drawer.Content>
                    <Drawer.Header class="pb-2">
                        <Drawer.Title class="text-sm font-semibold"
                            >Select a flavor</Drawer.Title
                        >
                        <p class="text-[11px] text-zinc-500">{product.name}</p>
                    </Drawer.Header>
                    <div class="flex flex-col px-4 pb-6">
                        {#each product.flavors as flavor (flavor.id)}
                            <button
                                type="button"
                                class={cn(
                                    'flex min-h-12 w-full items-center justify-between border-b border-zinc-800 px-1 py-3 text-left transition-colors last:border-b-0',
                                    selectedFlavorId === flavor.id
                                        ? 'text-amber-400'
                                        : 'text-zinc-300 hover:text-zinc-100',
                                )}
                                onclick={() => selectFlavor(flavor.id)}
                            >
                                <span class="text-sm font-medium"
                                    >{flavor.name}</span
                                >
                                <CheckIcon
                                    class={cn(
                                        'size-4  transition-opacity',
                                        selectedFlavorId === flavor.id
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                    )}
                                />
                            </button>
                        {/each}
                    </div>
                </Drawer.Content>
            </Drawer.Root>
        {/if}

        <!-- Size Selector -->
        {#if product.sizes.length === 1}
            <div
                class="flex items-center justify-between rounded-sm border border-zinc-700 bg-zinc-800 px-3 py-2"
            >
                <span class="text-xs font-medium text-zinc-300"
                    >{product.sizes[0].name}</span
                >
                <span class="tabular-nums text-[11px] text-zinc-400">
                    ₱{Number(product.sizes[0].price).toLocaleString('en-PH', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                    })}
                </span>
            </div>
        {:else if product.sizes.length > 1}
            <Drawer.Root
                bind:open={sizeDrawerOpen}
                shouldScaleBackground={false}
            >
                <Drawer.Trigger
                    class={cn(
                        'flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left transition-colors',
                        'border-blue-500/60 bg-blue-500/10 hover:bg-blue-500/15',
                    )}
                >
                    <div class="min-w-0">
                        <span class="text-xs font-medium text-blue-300"
                            >{selectedSize?.name}</span
                        >
                        <span
                            class="ml-1.5 tabular-nums text-[11px] text-blue-300/70"
                        >
                            ₱{Number(
                                selectedSize?.price ?? product.price,
                            ).toLocaleString('en-PH', {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                            })}
                        </span>
                    </div>
                    <ChevronDownIcon
                        class={cn(
                            'size-3.5  shrink-0 text-blue-400 transition-transform duration-200',
                            sizeDrawerOpen && 'rotate-180',
                        )}
                    />
                </Drawer.Trigger>
                <Drawer.Content>
                    <Drawer.Header class="pb-2">
                        <Drawer.Title class="text-sm font-semibold"
                            >Select a size</Drawer.Title
                        >
                        <p class="text-[11px] text-zinc-500">{product.name}</p>
                    </Drawer.Header>
                    <div class="flex flex-col px-4 pb-6">
                        {#each product.sizes as size (size.id)}
                            <button
                                type="button"
                                class={cn(
                                    'flex min-h-12 w-full items-center justify-between border-b border-zinc-800 px-1 py-3 text-left transition-colors last:border-b-0',
                                    selectedSizeId === size.id
                                        ? 'text-blue-400'
                                        : 'text-zinc-300 hover:text-zinc-100',
                                )}
                                onclick={() => selectSize(size.id)}
                            >
                                <span class="text-sm font-medium"
                                    >{size.name}</span
                                >
                                <div class="flex items-center gap-2.5">
                                    <span class="tabular-nums text-sm">
                                        ₱{Number(size.price).toLocaleString(
                                            'en-PH',
                                            {
                                                minimumFractionDigits: 0,
                                                maximumFractionDigits: 0,
                                            },
                                        )}
                                    </span>
                                    <CheckIcon
                                        class={cn(
                                            'size-4  transition-opacity',
                                            selectedSizeId === size.id
                                                ? 'opacity-100'
                                                : 'opacity-0',
                                        )}
                                    />
                                </div>
                            </button>
                        {/each}
                    </div>
                </Drawer.Content>
            </Drawer.Root>
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
                <ShoppingCartIcon class="size-4  sm:size-3 " />
                <span class="text-sm font-semibold sm:text-[11px]">Add</span>
            </Button>
        </div>
    </div>
</div>
