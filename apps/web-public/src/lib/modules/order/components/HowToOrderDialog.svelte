<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import * as Dialog from '@hyperion/ui/components/dialog'
    import BanknoteIcon from '@lucide/svelte/icons/banknote'
    import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2'
    import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list'
    import PackageCheckIcon from '@lucide/svelte/icons/package-check'
    import PackageSearchIcon from '@lucide/svelte/icons/package-search'
    import SearchIcon from '@lucide/svelte/icons/search'
    import ShieldCheckIcon from '@lucide/svelte/icons/shield-check'
    import ShoppingCartIcon from '@lucide/svelte/icons/shopping-cart'
    import SmartphoneIcon from '@lucide/svelte/icons/smartphone'

    ////////////////////
    // 01. Properties //
    ////////////////////

    type Props = { open: boolean }
    let { open = $bindable() }: Props = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    const STEPS = [
        {
            icon: SearchIcon,
            color: 'blue',
            title: 'Browse the Menu',
            desc: 'Explore bilao packages, bundle deals, and single orders. Filter by category or search for your favourite dish.',
            tip: 'Use the category tabs to quickly find what you want.',
        },
        {
            icon: ShoppingCartIcon,
            color: 'blue',
            title: 'Add Items to Cart',
            desc: 'Tap a product to see sizes and details, then add it to your cart. You can adjust quantities in the cart before checkout.',
            tip: 'Your cart is saved while you browse — no rush!',
        },
        {
            icon: ClipboardListIcon,
            color: 'blue',
            title: 'Fill in Order Details',
            desc: 'Enter your name, contact number, delivery type (Self Pick-up, Lalamove, or Other Courier), and preferred delivery date.',
            tip: 'Delivery address is required for courier orders.',
        },
        {
            icon: SmartphoneIcon,
            color: 'violet',
            title: 'Pay the Downpayment via GCash',
            desc: 'Send your downpayment to the provided GCash number. Take a screenshot of the transfer, then upload it as proof of payment.',
            tip: 'Make sure the screenshot clearly shows the amount and reference number.',
        },
        {
            icon: PackageSearchIcon,
            color: 'emerald',
            title: 'Submit & Save Your Tracking Code',
            desc: 'After submitting, you will receive a unique Tracking Code. Save it — you will use it to monitor your order status in real time.',
            tip: 'Bookmark the Track Order page and enter your code anytime.',
        },
        {
            icon: ShieldCheckIcon,
            color: 'yellow',
            title: 'Wait for Proof Verification',
            desc: 'Our team will verify your GCash screenshot. You will see the status update on your tracking page automatically — no need to refresh.',
            tip: 'If your proof is rejected, a reason will be shown and you can resubmit.',
        },
        {
            icon: BanknoteIcon,
            color: 'amber',
            title: 'Pay the Remaining Balance (if any)',
            desc: 'Once notified, pay the remaining balance via GCash or cash on pickup. Upload a new screenshot if paying via GCash.',
            tip: 'Cash on pickup means you bring the exact amount when you collect.',
        },
        {
            icon: PackageCheckIcon,
            color: 'emerald',
            title: 'Track & Receive Your Order',
            desc: 'Watch your order move through statuses: Pending → Cooking → Ready / On the Way → Delivered. We will notify you at every step.',
            tip: 'Status updates appear instantly on the tracking page.',
        },
        {
            icon: CheckCircle2Icon,
            color: 'emerald',
            title: 'Enjoy Your Meal!',
            desc: 'Your order is complete! Every dish is freshly cooked with love. We hope it brings joy to your table.',
            tip: 'Thank you for ordering from Cosina Ni Cacai! 🍚',
        },
    ] as const

    const COLOR_RING: Record<string, string> = {
        blue: 'ring-blue-500/30 bg-blue-500/10 text-blue-400',
        violet: 'ring-violet-500/30 bg-violet-500/10 text-violet-400',
        emerald: 'ring-emerald-500/30 bg-emerald-500/10 text-emerald-400',
        yellow: 'ring-yellow-500/30 bg-yellow-500/10 text-yellow-400',
        amber: 'ring-amber-500/30 bg-amber-500/10 text-amber-400',
    }

    const COLOR_NUM: Record<string, string> = {
        blue: 'bg-blue-600',
        violet: 'bg-violet-600',
        emerald: 'bg-emerald-600',
        yellow: 'bg-yellow-500',
        amber: 'bg-amber-500',
    }

    const COLOR_TIP: Record<string, string> = {
        blue: 'border-blue-500/20 bg-blue-500/5 text-blue-300/80',
        violet: 'border-violet-500/20 bg-violet-500/5 text-violet-300/80',
        emerald: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300/80',
        yellow: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-300/80',
        amber: 'border-amber-500/20 bg-amber-500/5 text-amber-300/80',
    }
</script>

<Dialog.Root bind:open>
    <Dialog.Content
        class="flex max-h-[90dvh] flex-col gap-0 border-zinc-800 bg-zinc-900 text-zinc-100 sm:max-w-lg p-0"
    >
        <Dialog.Header class="shrink-0 border-b border-zinc-800 px-6 py-5">
            <Dialog.Title class="text-base font-semibold text-zinc-100">
                How to Order
            </Dialog.Title>
            <Dialog.Description class="mt-0.5 text-sm text-zinc-400">
                Follow these steps to place and track your order with ease.
            </Dialog.Description>
        </Dialog.Header>

        <div class="flex-1 overflow-y-auto px-6 py-5">
            <ol class="flex flex-col gap-0">
                {#each STEPS as step, i (i)}
                    {@const Icon = step.icon}
                    {@const isLast = i === STEPS.length - 1}
                    <li class="flex gap-4">
                        <!-- Timeline spine -->
                        <div class="flex flex-col items-center">
                            <div
                                class="relative flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 {COLOR_RING[
                                    step.color
                                ]}"
                            >
                                <Icon class="size-4" />
                                <span
                                    class="absolute -right-1.5 -top-1.5 flex size-4.5 items-center justify-center rounded-full text-[9px] font-bold text-white {COLOR_NUM[
                                        step.color
                                    ]}">{i + 1}</span
                                >
                            </div>
                            {#if !isLast}
                                <div class="mt-1 h-full w-px bg-zinc-800"></div>
                            {/if}
                        </div>

                        <!-- Content -->
                        <div class="pb-5 pt-1 min-w-0 flex-1">
                            <p class="text-sm/snug font-semibold text-zinc-100">
                                {step.title}
                            </p>
                            <p class="mt-1 text-xs/relaxed text-zinc-400">
                                {step.desc}
                            </p>
                            <p
                                class="mt-2 rounded-md border px-2.5 py-1.5 text-[11px] leading-relaxed {COLOR_TIP[
                                    step.color
                                ]}"
                            >
                                💡 {step.tip}
                            </p>
                        </div>
                    </li>
                {/each}
            </ol>
        </div>

        <div class="shrink-0 border-t border-zinc-800 px-6 py-4">
            <Button
                onclick={() => (open = false)}
                class="w-full bg-blue-600 text-white hover:bg-blue-500"
            >
                Got it, let's order!
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root>
