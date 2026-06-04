<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import * as Sheet from '@hyperion/ui/components/sheet'
    import MinusIcon from '@lucide/svelte/icons/minus'
    import PlusIcon from '@lucide/svelte/icons/plus'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import Trash2Icon from '@lucide/svelte/icons/trash-2'

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

    /////////////////
    // 04. Derived //
    /////////////////

    const cartTotal = $derived(
        cart.reduce(
            (sum, item) => sum + parseFloat(item.price) * item.quantity,
            0,
        ),
    )

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

    function handlePlaceOrder() {
        open = false
        onPlaceOrder()
    }
</script>

<Sheet.Root bind:open>
    <Sheet.Content
        side="right"
        class="flex w-full flex-col border-zinc-800 bg-zinc-950 p-0 sm:max-w-md"
    >
        <Sheet.Header class="border-b border-zinc-800 px-6 py-5">
            <Sheet.Title class="flex items-center gap-2 text-zinc-100">
                <ShoppingCartIcon class="h-5 w-5 text-blue-400" />
                Your Cart
                {#if cart.length > 0}
                    <span
                        class="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white"
                    >
                        {cart.reduce((sum, i) => sum + i.quantity, 0)}
                    </span>
                {/if}
            </Sheet.Title>
        </Sheet.Header>

        <!-- Cart Items -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
            {#if cart.length === 0}
                <div
                    class="flex flex-col items-center justify-center gap-3 py-16 text-center"
                >
                    <ShoppingCartIcon class="h-12 w-12 text-zinc-700" />
                    <p class="text-sm text-zinc-500">Your cart is empty.</p>
                    <p class="text-xs text-zinc-600">
                        Add items from the menu to get started.
                    </p>
                </div>
            {:else}
                <ul class="flex flex-col gap-4">
                    {#each cart as item (item.key)}
                        <li class="flex gap-3">
                            <!-- Item Image -->
                            <div
                                class="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-800"
                            >
                                {#if item.imageUrl}
                                    <img
                                        src={item.imageUrl}
                                        alt={item.name}
                                        class="h-full w-full object-cover"
                                    />
                                {:else}
                                    <div
                                        class="flex h-full w-full items-center justify-center text-zinc-600"
                                    >
                                        <ShoppingCartIcon
                                            class="h-5 w-5 opacity-50"
                                        />
                                    </div>
                                {/if}
                            </div>

                            <!-- Item Details -->
                            <div class="flex flex-1 flex-col gap-1 min-w-0">
                                <div
                                    class="flex items-start justify-between gap-2"
                                >
                                    <div class="min-w-0">
                                        <p
                                            class="truncate text-sm font-medium text-zinc-100"
                                        >
                                            {item.name}
                                        </p>
                                        {#if item.sizeName}
                                            <p class="text-xs text-zinc-500">
                                                {item.sizeName}
                                            </p>
                                        {/if}
                                    </div>
                                    <button
                                        type="button"
                                        class="shrink-0 rounded p-1 text-zinc-600 transition-colors hover:bg-zinc-800 hover:text-red-400"
                                        onclick={() => removeItem(item.key)}
                                        aria-label="Remove item"
                                    >
                                        <Trash2Icon class="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                <div class="flex items-center justify-between">
                                    <!-- Quantity Controls -->
                                    <div
                                        class="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-800"
                                    >
                                        <button
                                            type="button"
                                            class="flex h-7 w-7 items-center justify-center rounded-l-lg text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-30"
                                            onclick={() =>
                                                decrementQty(item.key)}
                                            disabled={item.quantity <= 1}
                                        >
                                            <MinusIcon class="h-3 w-3" />
                                        </button>
                                        <span
                                            class="w-8 text-center text-sm font-medium text-zinc-100"
                                        >
                                            {item.quantity}
                                        </span>
                                        <button
                                            type="button"
                                            class="flex h-7 w-7 items-center justify-center rounded-r-lg text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
                                            onclick={() =>
                                                incrementQty(item.key)}
                                        >
                                            <PlusIcon class="h-3 w-3" />
                                        </button>
                                    </div>

                                    <!-- Line Total -->
                                    <span
                                        class="text-sm font-semibold text-blue-400"
                                    >
                                        ₱{(
                                            parseFloat(item.price) *
                                            item.quantity
                                        ).toLocaleString('en-PH', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </span>
                                </div>
                            </div>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>

        <!-- Footer -->
        {#if cart.length > 0}
            <div class="border-t border-zinc-800 px-6 py-5">
                <div class="mb-4 flex items-center justify-between">
                    <span class="text-sm text-zinc-400">Subtotal</span>
                    <span class="text-lg font-bold text-zinc-100">
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
                    class="w-full bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700"
                    onclick={handlePlaceOrder}
                >
                    Place Order
                </Button>
            </div>
        {/if}
    </Sheet.Content>
</Sheet.Root>
