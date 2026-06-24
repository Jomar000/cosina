<script lang="ts">
    import * as AlertDialog from '@hyperion/ui/components/alert-dialog'
    import { Button } from '@hyperion/ui/components/button'
    import * as Dialog from '@hyperion/ui/components/dialog'
    import { Input } from '@hyperion/ui/components/input'
    import { Label } from '@hyperion/ui/components/label'
    import * as Select from '@hyperion/ui/components/select'
    import { Separator } from '@hyperion/ui/components/separator'
    import { Skeleton } from '@hyperion/ui/components/skeleton'
    import { Checkbox } from '@hyperion/ui/components/checkbox'
    import { Textarea } from '@hyperion/ui/components/textarea'
    import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
    import PencilIcon from '@lucide/svelte/icons/pencil'
    import PlusIcon from '@lucide/svelte/icons/plus'
    import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag'
    import Trash2Icon from '@lucide/svelte/icons/trash-2'
    import ProductImageUploader from '$lib/components/product/ProductImageUploader.svelte'
    import {
        createMutation,
        createQuery,
        useQueryClient,
    } from '@tanstack/svelte-query'
    import { toast } from 'svelte-sonner'

    import { adminClient } from '$lib/clients'
    import { wsClientManager } from '$lib/utilities/wsClientManager'

    ///////////////////
    // 02. Constants //
    ///////////////////

    type TCategory = 'bilao_package' | 'bundle_package' | 'single_order'
    type TTag = 'new' | 'best_seller' | 'seasonal' | 'limited'
    type TSizeRow = { _key: number; name: string; price: string }
    type TSizePayload = { name: string; price: string }
    type TProduct = {
        id: number
        publicId: string
        name: string
        ingredients: string | null
        category: TCategory
        price: string
        imageObjectStorageId: string | null
        imageUrl: string | null
        isAvailable: boolean
        tags: TTag[]
        sizes: { id: number; name: string; price: string }[]
    }

    const CATEGORY_LABELS: Record<TCategory, string> = {
        bilao_package: 'Bilao Package',
        bundle_package: 'Bundle Package',
        single_order: 'Single Order',
    }

    const CATEGORY_OPTIONS: { value: TCategory; label: string }[] = [
        { value: 'bilao_package', label: 'Bilao Package' },
        { value: 'bundle_package', label: 'Bundle Package' },
        { value: 'single_order', label: 'Single Order' },
    ]

    const CATEGORY_COLORS: Record<TCategory, string> = {
        bilao_package: 'bg-amber-500',
        bundle_package: 'bg-violet-500',
        single_order: 'bg-blue-500',
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

    const TAG_OPTIONS: TTag[] = [
        'new',
        'best_seller',
        'seasonal',
        'limited',
    ]

    ///////////////
    // 03. State //
    ///////////////

    const queryClient = useQueryClient()

    let dialogOpen = $state(false)
    let deleteDialogOpen = $state(false)

    let editingProduct = $state<TProduct | null>(null)
    let deleteTarget = $state<{ id: number; name: string } | null>(null)

    let formName = $state('')
    let formIngredients = $state('')
    let formCategory = $state<TCategory>('single_order')
    let formPrice = $state('')
    let formIsAvailable = $state(true)
    let formTags = $state<TTag[]>([])
    let formSizes = $state<TSizeRow[]>([])
    let nextSizeKey = 0
    let formImageObjectStorageId = $state<string | null>(null)
    let formInitialImageUrl = $state<string | null>(null)
    let imageIsUploading = $state(false)

    /////////////////
    // 05. Queries //
    /////////////////

    const productsQuery = createQuery(() => ({
        queryKey: [
            'admin',
            'products',
        ],
        queryFn: async () => {
            const response = await adminClient.product.readMany.$get({
                query: { limit: '100', offset: '0', sortOrder: 'asc' },
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data as TProduct[]
        },
    }))

    ///////////////////
    // 06. Mutations //
    ///////////////////

    const createProductMutation = createMutation(() => ({
        mutationKey: [
            'admin',
            'product',
            'create',
        ],
        mutationFn: async (payload: {
            name: string
            ingredients?: string
            category: TCategory
            price: string
            imageObjectStorageId?: string | null
            isAvailable: boolean
            tags: TTag[]
            sizes: TSizePayload[]
        }) => {
            const response = await adminClient.product.create.$post({
                json: payload,
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [
                    'admin',
                    'products',
                ],
            })
            toast.success('Product created.')
            dialogOpen = false
        },
        onError: (err: Error) => toast.error(err.message),
    }))

    const updateProductMutation = createMutation(() => ({
        mutationKey: [
            'admin',
            'product',
            'update',
        ],
        mutationFn: async (payload: {
            productId: number
            name?: string
            ingredients?: string
            category?: TCategory
            price?: string
            imageObjectStorageId?: string | null
            isAvailable?: boolean
            tags?: TTag[]
            sizes: TSizePayload[]
        }) => {
            const response = await adminClient.product.update.$post({
                json: payload,
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [
                    'admin',
                    'products',
                ],
            })
            toast.success('Product updated.')
            dialogOpen = false
        },
        onError: (err: Error) => toast.error(err.message),
    }))

    const deleteProductMutation = createMutation(() => ({
        mutationKey: [
            'admin',
            'product',
            'delete',
        ],
        mutationFn: async (productId: number) => {
            const response = await adminClient.product.delete.$post({
                json: { productId },
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [
                    'admin',
                    'products',
                ],
            })
            toast.success('Product deleted.')
            deleteDialogOpen = false
            deleteTarget = null
        },
        onError: (err: Error) => toast.error(err.message),
    }))

    /////////////////
    // 04. Derived //
    /////////////////

    const isMutating = $derived(
        imageIsUploading ||
            createProductMutation.isPending ||
            updateProductMutation.isPending ||
            deleteProductMutation.isPending,
    )

    /////////////////
    // 08. Effects //
    /////////////////

    $effect(() => {
        const ws = wsClientManager.connect('products')

        function handleMessage() {
            queryClient.invalidateQueries({
                queryKey: [
                    'admin',
                    'products',
                ],
            })
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

    function openCreateDialog() {
        editingProduct = null
        formName = ''
        formIngredients = ''
        formCategory = 'single_order'
        formPrice = ''
        formIsAvailable = true
        formTags = []
        formSizes = []
        formImageObjectStorageId = null
        formInitialImageUrl = null
        dialogOpen = true
    }

    function openEditDialog(p: TProduct) {
        editingProduct = p
        formName = p.name
        formIngredients = p.ingredients ?? ''
        formCategory = p.category
        formPrice = p.price
        formIsAvailable = p.isAvailable
        formTags = [...p.tags]
        formSizes = p.sizes.map((s) => ({
            _key: nextSizeKey++,
            name: s.name,
            price: s.price,
        }))
        formImageObjectStorageId = p.imageObjectStorageId
        formInitialImageUrl = p.imageUrl
        dialogOpen = true
    }

    function openDeleteDialog(p: { id: number; name: string }) {
        deleteTarget = p
        deleteDialogOpen = true
    }

    function addSize() {
        formSizes = [
            ...formSizes,
            { _key: nextSizeKey++, name: '', price: '' },
        ]
    }

    function removeSize(index: number) {
        formSizes = formSizes.filter((_, i) => i !== index)
    }

    function updateSize(index: number, field: 'name' | 'price', value: string) {
        formSizes = formSizes.map((s, i) =>
            i === index ? { ...s, [field]: value } : s,
        )
    }

    async function handleSubmit(e: SubmitEvent) {
        e.preventDefault()

        if (imageIsUploading) return

        const validSizes = formSizes
            .filter((s) => s.name.trim() && s.price.trim())
            .map(({ name, price }) => ({ name, price }))

        const payload = {
            name: formName.trim(),
            ingredients: formIngredients.trim() || undefined,
            category: formCategory,
            price: formPrice,
            imageObjectStorageId: formImageObjectStorageId,
            isAvailable: formIsAvailable,
            tags: formTags,
            sizes: validSizes,
        }

        if (editingProduct) {
            await updateProductMutation.mutateAsync({
                productId: editingProduct.id,
                ...payload,
            })
        } else {
            await createProductMutation.mutateAsync(payload)
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return
        await deleteProductMutation.mutateAsync(deleteTarget.id)
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function formatPrice(price: string) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(Number(price))
    }
</script>

<main class="flex flex-1 flex-col gap-6 p-4 pt-0 md:p-6 md:pt-0">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-bold tracking-tight">Products</h1>
            <p class="text-muted-foreground text-sm">
                {#if productsQuery.data}
                    {@const available = productsQuery.data.filter(
                        (p) => p.isAvailable,
                    ).length}
                    {productsQuery.data.length}
                    {productsQuery.data.length === 1 ? 'item' : 'items'} &middot;
                    {available} available
                {:else}
                    Manage your ordering system products.
                {/if}
            </p>
        </div>
        <Button
            onclick={openCreateDialog}
            class="gap-2 shadow-sm"
        >
            <PlusIcon class="size-4" />
            Add Product
        </Button>
    </div>

    <Separator />

    <!-- Loading -->
    {#if productsQuery.isPending}
        <div
            class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
            {#each { length: 6 }, i (i)}
                <div class="bg-card overflow-hidden rounded-xl border">
                    <Skeleton class="aspect-4/3 w-full rounded-none" />
                    <div class="flex flex-col gap-3 p-4">
                        <div class="flex items-center gap-1.5">
                            <Skeleton class="size-2 rounded-full" />
                            <Skeleton class="h-3.5 w-24" />
                        </div>
                        <Skeleton class="h-5 w-3/4" />
                        <Skeleton class="h-7 w-1/3" />
                        <Skeleton class="h-3.5 w-full" />
                        <Skeleton class="h-3.5 w-2/3" />
                    </div>
                    <div class="border-t px-4 py-2.5 flex gap-2">
                        <Skeleton class="h-8 flex-1 rounded-md" />
                        <Skeleton class="h-8 flex-1 rounded-md" />
                    </div>
                </div>
            {/each}
        </div>

        <!-- Error -->
    {:else if productsQuery.isError}
        <div
            class="text-destructive flex flex-1 items-center justify-center text-sm"
        >
            Failed to load products. Please refresh.
        </div>

        <!-- Empty -->
    {:else if productsQuery.data?.length === 0}
        <div
            class="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center"
        >
            <div class="bg-muted rounded-full p-5">
                <ShoppingBagIcon class="text-muted-foreground size-8" />
            </div>
            <div>
                <p class="font-semibold">No products yet</p>
                <p class="text-muted-foreground mt-1 text-sm">
                    Add your first product to get started.
                </p>
            </div>
            <Button
                onclick={openCreateDialog}
                class="mt-1 gap-2"
            >
                <PlusIcon class="size-4" />
                Add Product
            </Button>
        </div>

        <!-- Grid -->
    {:else}
        <div
            class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
            {#each productsQuery.data ?? [] as p (p.id)}
                <div
                    class="bg-card group flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                    <!-- Image -->
                    <div class="bg-muted relative aspect-4/3 overflow-hidden">
                        {#if p.imageUrl}
                            <img
                                src={p.imageUrl}
                                alt={p.name}
                                class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        {:else}
                            <div
                                class="from-muted to-muted/60 flex size-full items-center justify-center bg-linear-to-br"
                            >
                                <ShoppingBagIcon
                                    class="text-muted-foreground/25 size-12"
                                />
                            </div>
                        {/if}

                        <!-- Availability pill -->
                        <div class="absolute top-2.5 right-2.5">
                            {#if p.isAvailable}
                                <span
                                    class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm"
                                >
                                    <span class="size-1.5 rounded-full bg-white"
                                    ></span>
                                    Available
                                </span>
                            {:else}
                                <span
                                    class="inline-flex items-center rounded-full bg-black/50 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm backdrop-blur-sm"
                                >
                                    Unavailable
                                </span>
                            {/if}
                        </div>
                    </div>

                    <!-- Body -->
                    <div class="flex flex-1 flex-col gap-2.5 p-4">
                        <!-- Category -->
                        <div class="flex items-center gap-1.5">
                            <span
                                class="size-2 rounded-full {CATEGORY_COLORS[
                                    p.category
                                ]}"
                            ></span>
                            <span
                                class="text-muted-foreground text-xs font-medium"
                            >
                                {CATEGORY_LABELS[p.category]}
                            </span>
                        </div>

                        <!-- Tags -->
                        {#if p.tags.length > 0}
                            <div class="flex flex-wrap gap-1">
                                {#each p.tags as tag (tag)}
                                    <span
                                        class="rounded-full px-2 py-0.5 text-[10px] font-bold text-white {TAG_COLORS[
                                            tag
                                        ]}"
                                    >
                                        {TAG_LABELS[tag]}
                                    </span>
                                {/each}
                            </div>
                        {/if}

                        <!-- Name -->
                        <h3 class="line-clamp-2 font-semibold leading-snug">
                            {p.name}
                        </h3>

                        <!-- Price -->
                        {#if p.sizes.length > 0}
                            <div class="flex flex-col gap-1">
                                {#each p.sizes as size (size.id)}
                                    <div
                                        class="flex items-center justify-between text-sm"
                                    >
                                        <span class="text-muted-foreground"
                                            >{size.name}</span
                                        >
                                        <span class="font-semibold tabular-nums"
                                            >{formatPrice(size.price)}</span
                                        >
                                    </div>
                                {/each}
                            </div>
                        {:else}
                            <p class="text-xl font-bold tabular-nums">
                                {formatPrice(p.price)}
                            </p>
                        {/if}

                        <!-- Ingredients -->
                        {#if p.ingredients}
                            <p
                                class="text-muted-foreground line-clamp-2 text-xs leading-relaxed"
                            >
                                {p.ingredients}
                            </p>
                        {/if}
                    </div>

                    <!-- Footer actions -->
                    <div class="border-t px-4 py-2.5 flex items-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            class="h-8 flex-1 gap-1.5 text-xs"
                            onclick={() => openEditDialog(p)}
                        >
                            <PencilIcon class="size-3.5" />
                            Edit
                        </Button>
                        <div class="bg-border h-4 w-px shrink-0"></div>
                        <Button
                            variant="ghost"
                            size="sm"
                            class="text-destructive hover:text-destructive h-8 flex-1 gap-1.5 text-xs"
                            onclick={() =>
                                openDeleteDialog({ id: p.id, name: p.name })}
                        >
                            <Trash2Icon class="size-3.5" />
                            Delete
                        </Button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</main>

<!-- Create / Edit Dialog -->
<Dialog.Root bind:open={dialogOpen}>
    <Dialog.Content
        class="flex max-h-[90dvh] flex-col overflow-hidden p-0 sm:max-w-md"
    >
        <!-- Header -->
        <div class="flex shrink-0 items-start gap-3.5 px-6 pt-6 pb-5 pr-12">
            <div
                class="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-xl"
            >
                {#if editingProduct}
                    <PencilIcon class="text-primary size-4" />
                {:else}
                    <ShoppingBagIcon class="text-primary size-4" />
                {/if}
            </div>
            <div class="min-w-0">
                <Dialog.Title class="text-base font-semibold leading-tight">
                    {editingProduct ? 'Edit Product' : 'Add Product'}
                </Dialog.Title>
                <Dialog.Description
                    class="text-muted-foreground mt-0.5 text-sm"
                >
                    {editingProduct
                        ? `Editing "${editingProduct.name}"`
                        : 'Fill in the details to add a new product.'}
                </Dialog.Description>
            </div>
        </div>

        <Separator class="shrink-0" />

        <!-- Scrollable body -->
        <form
            id="product-form"
            class="flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto px-6 py-5"
            onsubmit={handleSubmit}
        >
            <!-- Image + Name/Category/Price -->
            <div class="flex gap-4">
                <!-- Image uploader -->
                <div class="w-28 shrink-0">
                    <Label class="mb-1.5 block text-xs font-medium">Photo</Label
                    >
                    <ProductImageUploader
                        bind:objectStorageId={formImageObjectStorageId}
                        bind:isUploading={imageIsUploading}
                        initialImageUrl={formInitialImageUrl}
                    />
                </div>

                <!-- Name + Category + Price stacked on the right -->
                <div class="flex min-w-0 flex-1 flex-col gap-3">
                    <div class="flex flex-col gap-1.5">
                        <Label
                            for="pf-name"
                            class="text-xs font-medium">Product Name</Label
                        >
                        <Input
                            id="pf-name"
                            placeholder="e.g. Chicken Adobo"
                            required
                            maxlength={128}
                            bind:value={formName}
                        />
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <Label class="text-xs font-medium">Category</Label>
                        <Select.Root
                            type="single"
                            value={formCategory}
                            onValueChange={(v: string | undefined) =>
                                (formCategory = (v ??
                                    formCategory) as TCategory)}
                        >
                            <Select.Trigger class="w-full">
                                <div class="flex min-w-0 items-center gap-2">
                                    <span
                                        class="size-2 shrink-0 rounded-full {CATEGORY_COLORS[
                                            formCategory
                                        ]}"
                                    ></span>
                                    <span class="truncate"
                                        >{CATEGORY_LABELS[formCategory]}</span
                                    >
                                </div>
                            </Select.Trigger>
                            <Select.Content>
                                {#each CATEGORY_OPTIONS as opt (opt.value)}
                                    <Select.Item value={opt.value}>
                                        <div class="flex items-center gap-2">
                                            <span
                                                class="size-2 shrink-0 rounded-full {CATEGORY_COLORS[
                                                    opt.value
                                                ]}"
                                            ></span>
                                            {opt.label}
                                        </div>
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <Label
                            for="pf-price"
                            class="text-xs font-medium">Base Price</Label
                        >
                        <div class="relative flex items-center">
                            <span
                                class="text-muted-foreground pointer-events-none absolute left-3 select-none text-sm"
                                >₱</span
                            >
                            <Input
                                id="pf-price"
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                required
                                bind:value={formPrice}
                                class="pl-7"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Ingredients -->
            <div class="flex flex-col gap-1.5">
                <Label
                    for="pf-ingredients"
                    class="text-xs font-medium"
                >
                    Ingredients
                    <span class="text-muted-foreground font-normal"
                        >(optional)</span
                    >
                </Label>
                <Textarea
                    id="pf-ingredients"
                    placeholder="e.g. Chicken, soy sauce, vinegar, garlic..."
                    maxlength={512}
                    rows={2}
                    bind:value={formIngredients}
                    class="resize-none text-sm"
                />
            </div>

            <!-- Tags -->
            <div class="flex flex-col gap-2">
                <Label class="text-xs font-medium">
                    Tags
                    <span class="text-muted-foreground font-normal"
                        >(optional)</span
                    >
                </Label>
                <div class="flex flex-wrap gap-x-4 gap-y-2">
                    {#each TAG_OPTIONS as tag (tag)}
                        <label
                            class="flex cursor-pointer select-none items-center gap-1.5"
                        >
                            <Checkbox
                                checked={formTags.includes(tag)}
                                onCheckedChange={(v) =>
                                    (formTags = v
                                        ? [...formTags, tag]
                                        : formTags.filter((t) => t !== tag))}
                            />
                            <span class="text-sm">{TAG_LABELS[tag]}</span>
                        </label>
                    {/each}
                </div>
            </div>

            <!-- Sizes -->
            <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between">
                    <div>
                        <Label class="text-xs font-medium">Sizes & Prices</Label
                        >
                        <p class="text-muted-foreground text-xs">
                            Override base price per size.
                        </p>
                    </div>
                    {#if formSizes.length > 0}
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onclick={addSize}
                            class="h-7 gap-1 px-2 text-xs"
                        >
                            <PlusIcon class="size-3" />
                            Add Size
                        </Button>
                    {/if}
                </div>

                {#if formSizes.length === 0}
                    <button
                        type="button"
                        onclick={addSize}
                        class="border-muted-foreground/25 hover:border-muted-foreground/40 hover:bg-muted/50 flex w-full flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-4 text-center transition-colors"
                    >
                        <PlusIcon class="text-muted-foreground size-4" />
                        <span class="text-muted-foreground text-xs">
                            No sizes — base price applies.<br />Click to add a
                            size variant.
                        </span>
                    </button>
                {:else}
                    <div class="flex flex-col gap-1.5">
                        {#each formSizes as size, i (size._key)}
                            <div
                                class="bg-muted/40 grid items-center gap-2 rounded-lg px-2 py-1.5"
                                style="grid-template-columns: 1fr 6rem 2rem"
                            >
                                <Input
                                    placeholder="Size name"
                                    maxlength={64}
                                    value={size.name}
                                    oninput={(e: Event) =>
                                        updateSize(
                                            i,
                                            'name',
                                            (
                                                e.currentTarget as HTMLInputElement
                                            ).value,
                                        )}
                                    class="h-8 min-w-0 border-transparent bg-transparent text-sm shadow-none focus-visible:border-input focus-visible:bg-background"
                                />
                                <div class="relative flex items-center">
                                    <span
                                        class="text-muted-foreground pointer-events-none absolute left-2.5 select-none text-xs"
                                        >₱</span
                                    >
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        value={size.price}
                                        oninput={(e: Event) =>
                                            updateSize(
                                                i,
                                                'price',
                                                (
                                                    e.currentTarget as HTMLInputElement
                                                ).value,
                                            )}
                                        class="h-8 min-w-0 border-transparent bg-transparent pl-6 text-sm shadow-none focus-visible:border-input focus-visible:bg-background"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    class="text-muted-foreground hover:text-destructive size-8 shrink-0"
                                    onclick={() => removeSize(i)}
                                >
                                    <Trash2Icon class="size-3.5" />
                                </Button>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- Available toggle -->
            <div
                class="bg-muted/50 flex items-center gap-3 rounded-xl border px-4 py-3"
            >
                <Checkbox
                    id="pf-status"
                    bind:checked={formIsAvailable}
                />
                <div>
                    <Label
                        for="pf-status"
                        class="cursor-pointer text-sm font-medium"
                    >
                        Available
                    </Label>
                    <p class="text-muted-foreground text-xs">
                        Show this product to customers
                    </p>
                </div>
            </div>
        </form>

        <Separator class="shrink-0" />

        <!-- Footer -->
        <div class="flex shrink-0 items-center justify-end gap-2 px-6 py-4">
            <Button
                type="button"
                variant="outline"
                onclick={() => (dialogOpen = false)}
                disabled={isMutating}
            >
                Cancel
            </Button>
            <Button
                type="submit"
                form="product-form"
                disabled={isMutating}
                class="gap-2"
            >
                {#if isMutating}
                    <LoaderCircleIcon class="size-4 animate-spin" />
                    Saving…
                {:else if editingProduct}
                    Save Changes
                {:else}
                    Create Product
                {/if}
            </Button>
        </div>
    </Dialog.Content>
</Dialog.Root>

<!-- Delete Confirm -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
    <AlertDialog.Content class="sm:max-w-sm">
        <AlertDialog.Header>
            <div class="mb-3 flex items-center gap-3">
                <div
                    class="bg-destructive/10 flex size-10 shrink-0 items-center justify-center rounded-xl"
                >
                    <Trash2Icon class="text-destructive size-4" />
                </div>
                <AlertDialog.Title class="text-base"
                    >Delete product?</AlertDialog.Title
                >
            </div>
            <AlertDialog.Description class="text-sm">
                <strong class="text-foreground font-medium"
                    >"{deleteTarget?.name}"</strong
                >
                will be permanently removed along with all its size variants. This
                cannot be undone.
            </AlertDialog.Description>
        </AlertDialog.Header>
        <AlertDialog.Footer class="mt-2">
            <AlertDialog.Cancel
                onclick={() => {
                    deleteDialogOpen = false
                    deleteTarget = null
                }}
                disabled={isMutating}
            >
                Cancel
            </AlertDialog.Cancel>
            <AlertDialog.Action
                onclick={handleDelete}
                disabled={isMutating}
                class="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
                {#if isMutating}
                    <LoaderCircleIcon class="size-4 animate-spin" />
                    Deleting…
                {:else}
                    Delete
                {/if}
            </AlertDialog.Action>
        </AlertDialog.Footer>
    </AlertDialog.Content>
</AlertDialog.Root>
