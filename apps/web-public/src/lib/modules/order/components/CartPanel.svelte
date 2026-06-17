<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import * as Sheet from '@hyperion/ui/components/sheet'
    import { cn } from '@hyperion/ui/utils'
    import MinusIcon from '@lucide/svelte/icons/minus'
    import PlusIcon from '@lucide/svelte/icons/plus'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import Trash2Icon from '@lucide/svelte/icons/trash-2'
    import UtensilsIcon from '@lucide/svelte/icons/utensils'

    import type { TCartItem } from '../types.js'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        open = $bindable(false),
        cart = $bindable<TCartItem[]>([]),
        onPlaceOrder,
    }: {
        open: boolean
        cart: TCartItem[]
        onPlaceOrder: () => void
    } = $props()

    ///////////////
    // 03. State //
    ///////////////

    let isMobile = $state(
        typeof window !== 'undefined' &&
            window.matchMedia('(max-width: 639px)').matches,
    )

    /////////////////
    // 04. Derived //
    /////////////////

    const cartTotal = $derived(
        cart.reduce(
            (sum, item) => sum + parseFloat(item.price) * item.quantity,
            0,
        ),
    )

    const cartItemCount = $derived(cart.reduce((sum, i) => sum + i.quantity, 0))

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        const mq = window.matchMedia('(max-width: 639px)')
        function handleChange(e: MediaQueryListEvent) {
            isMobile = e.matches
        }
        mq.addEventListener('change', handleChange)
        return () => mq.removeEventListener('change', handleChange)
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    function incrementQty(key: number) {
        cart = cart.map((item) =>
            item.key === key
                ? { ...item, quantity: Math.min(item.quantity + 1, 100) }
                : item,
        )
    }

    function decrementQty(key: number) {
        cart = cart
            .map((item) =>
                item.key === key
                    ? { ...item, quantity: item.quantity - 1 }
                    : item,
            )
            .filter((item) => item.quantity > 0)
    }

    function removeItem(key: number) {
        cart = cart.filter((item) => item.key !== key)
    }

    function clearCart() {
        cart = []
    }

    function handlePlaceOrder() {
        open = false
        onPlaceOrder()
    }
</script>

<Sheet.Root bind:open>
    <Sheet.Content
        side={isMobile ? 'bottom' : 'right'}
        class={cn(
            'flex flex-col border-zinc-800 bg-zinc-950 p-0',
            isMobile ? 'max-h-[88dvh] rounded-t-2xl' : 'w-full sm:max-w-md',
        )}
    >
        <!-- Drag handle — mobile bottom sheet only -->
        {#if isMobile}
            <div
                class="flex shrink-0 justify-center pb-1 pt-3"
                aria-hidden="true"
            >
                <div class="h-1 w-10 rounded-full bg-zinc-700"></div>
            </div>
        {/if}

        <!-- Header -->
        <Sheet.Header class="shrink-0 border-b border-zinc-800 px-5 py-4">
            <div class="flex items-center justify-between">
                <Sheet.Title
                    class="flex items-center gap-2 text-base font-semibold text-zinc-100"
                >
                    <ShoppingCartIcon class="h-5 w-5 text-blue-400" />
                    Cart
                    {#if cartItemCount > 0}
                        <span
                            class="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white"
                        >
                            {cartItemCount}
                        </span>
                    {/if}
                </Sheet.Title>
                {#if cart.length > 0}
                    <button
                        type="button"
                        onclick={clearCart}
                        class="text-xs text-zinc-500 transition-colors hover:text-red-400"
                    >
                        Clear all
                    </button>
                {/if}
            </div>
        </Sheet.Header>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
            {#if cart.length === 0}
                <!-- Empty state -->
                <div
                    class="flex flex-col items-center justify-center gap-4 py-20 text-center"
                >
                    <div
                        class="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900"
                    >
                        <ShoppingCartIcon class="h-8 w-8 text-zinc-600" />
                    </div>
                    <div>
                        <p class="text-sm font-medium text-zinc-400">
                            Your cart is empty
                        </p>
                        <p class="mt-0.5 text-xs text-zinc-600">
                            Add items from the menu to get started.
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onclick={() => (open = false)}
                        class="border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    >
                        Browse menu
                    </Button>
                </div>
            {:else}
                <ul class="flex flex-col gap-3">
                    {#each cart as item (item.key)}
                        <li
                            class="rounded-xl border border-zinc-800 bg-zinc-900 p-3"
                        >
                            <!-- Top row: thumbnail + name + remove -->
                            <div class="flex gap-3">
                                <div
                                    class="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-zinc-800"
                                >
                                    {#if item.imageUrl}
                                        <img
                                            src={item.imageUrl}
                                            alt={item.name}
                                            class="h-full w-full object-cover"
                                        />
                                    {:else}
                                        <div
                                            class="flex h-full w-full items-center justify-center"
                                        >
                                            <UtensilsIcon
                                                class="h-6 w-6 text-zinc-600 opacity-50"
                                            />
                                        </div>
                                    {/if}
                                </div>

                                <div
                                    class="flex min-w-0 flex-1 flex-col gap-0.5"
                                >
                                    <div
                                        class="flex items-start justify-between gap-2"
                                    >
                                        <p
                                            class="truncate text-sm font-semibold leading-snug text-zinc-100"
                                        >
                                            {item.name}
                                        </p>
                                        <button
                                            type="button"
                                            onclick={() => removeItem(item.key)}
                                            aria-label="Remove {item.name}"
                                            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
                                        >
                                            <Trash2Icon class="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {#if item.sizeName}
                                        <p class="text-xs text-zinc-500">
                                            {item.sizeName}
                                        </p>
                                    {/if}
                                    <p
                                        class="tabular-nums text-xs text-zinc-600"
                                    >
                                        ₱{Number(item.price).toLocaleString(
                                            'en-PH',
                                            {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            },
                                        )} each
                                    </p>
                                </div>
                            </div>

                            <!-- Bottom row: qty controls + line total -->
                            <div class="mt-3 flex items-center justify-between">
                                <div
                                    class="flex items-center overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800"
                                >
                                    <button
                                        type="button"
                                        onclick={() => decrementQty(item.key)}
                                        disabled={item.quantity <= 1}
                                        aria-label="Decrease quantity"
                                        class="flex h-9 w-9 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-30"
                                    >
                                        <MinusIcon class="h-3.5 w-3.5" />
                                    </button>
                                    <span
                                        class="min-w-8 text-center text-sm font-semibold tabular-nums text-zinc-100"
                                    >
                                        {item.quantity}
                                    </span>
                                    <button
                                        type="button"
                                        onclick={() => incrementQty(item.key)}
                                        aria-label="Increase quantity"
                                        class="flex h-9 w-9 items-center justify-center text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
                                    >
                                        <PlusIcon class="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                <span
                                    class="text-sm font-bold tabular-nums text-blue-400"
                                >
                                    ₱{(
                                        parseFloat(item.price) * item.quantity
                                    ).toLocaleString('en-PH', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>

        <!-- Footer -->
        {#if cart.length > 0}
            <div
                class="shrink-0 border-t border-zinc-800 px-4 pb-8 pt-4 sm:px-5 sm:pb-5"
            >
                <div class="mb-1 flex items-center justify-between">
                    <span class="text-sm text-zinc-400">
                        Subtotal ({cartItemCount}
                        {cartItemCount === 1 ? 'item' : 'items'})
                    </span>
                    <span class="text-lg font-bold tabular-nums text-zinc-100">
                        ₱{cartTotal.toLocaleString('en-PH', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                        })}
                    </span>
                </div>
                <p class="mb-4 text-xs text-zinc-600">
                    Delivery charges and other fees may apply.
                </p>
                <Button
                    onclick={handlePlaceOrder}
                    class="h-12 w-full bg-blue-600 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:bg-blue-700"
                >
                    Place Order · ₱{cartTotal.toLocaleString('en-PH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </Button>
            </div>
        {/if}
    </Sheet.Content>
</Sheet.Root>
