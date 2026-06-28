<script lang="ts">
    import * as AlertDialog from '@cosina/ui/components/alert-dialog'
    import { Button } from '@cosina/ui/components/button'
    import * as Dialog from '@cosina/ui/components/dialog'
    import { Input } from '@cosina/ui/components/input'
    import { Label } from '@cosina/ui/components/label'
    import * as Select from '@cosina/ui/components/select'
    import { Separator } from '@cosina/ui/components/separator'
    import { Skeleton } from '@cosina/ui/components/skeleton'
    import { Checkbox } from '@cosina/ui/components/checkbox'
    import { Textarea } from '@cosina/ui/components/textarea'
    import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle'
    import PackageIcon from '@lucide/svelte/icons/package'
    import PencilIcon from '@lucide/svelte/icons/pencil'
    import PlusIcon from '@lucide/svelte/icons/plus'
    import ShoppingBagIcon from '@lucide/svelte/icons/shopping-bag'
    import Trash2Icon from '@lucide/svelte/icons/trash-2'
    import SingleFileUpload from '$lib/components/upload/SingleFileUpload.svelte'
    import {
        createMutation,
        createQuery,
        useQueryClient,
    } from '@tanstack/svelte-query'
    import { tick } from 'svelte'
    import { toast } from 'svelte-sonner'

    import { adminClient } from '$lib/clients'
    import { wsClientManager } from '$lib/utilities/wsClientManager'

    ///////////////////
    // 02. Constants //
    ///////////////////

    type TCategory = 'bilao_package' | 'bundle_package' | 'single_order'
    type TTag = 'new' | 'best_seller' | 'seasonal' | 'limited'
    type TFlavorRow = { _key: number; name: string }
    type TFlavorPayload = { name: string }
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
        flavors: { id: number; name: string }[]
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
    let categoryFilter = $state<TCategory | null>(null)

    let editingProduct = $state<TProduct | null>(null)
    let deleteTarget = $state<{ id: number; name: string } | null>(null)

    let formName = $state('')
    let formIngredients = $state('')
    let formCategory = $state<TCategory>('single_order')
    let formPrice = $state('')
    let formIsAvailable = $state(true)
    let formTags = $state<TTag[]>([])
    let formFlavors = $state<TFlavorRow[]>([])
    let nextFlavorKey = 0
    let formSizes = $state<TSizeRow[]>([])
    let nextSizeKey = 0
    let formImageObjectStorageId = $state<string | null>(null)
    let formInitialImageUrl = $state<string | null>(null)
    let imageIsCommitted = $state(false)
    let imageObjectId = $state('')

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

    /////////////////
    // 04. Derived //
    /////////////////

    const filteredProducts = $derived(
        categoryFilter === null
            ? (productsQuery.data ?? [])
            : (productsQuery.data ?? []).filter(
                  (p) => p.category === categoryFilter,
              ),
    )

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
            flavors: TFlavorPayload[]
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
            flavors: TFlavorPayload[]
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
        (imageObjectId !== '' && !imageIsCommitted) ||
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
        formFlavors = []
        formSizes = []
        formImageObjectStorageId = null
        formInitialImageUrl = null
        imageIsCommitted = false
        imageObjectId = ''
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
        formFlavors = p.flavors.map((f) => ({
            _key: nextFlavorKey++,
            name: f.name,
        }))
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

    async function addFlavor() {
        formFlavors = [
            ...formFlavors,
            { _key: nextFlavorKey++, name: '' },
        ]
        await tick()
        const list = document.getElementById('pf-flavor-list')
        const inputs = list?.querySelectorAll<HTMLInputElement>(
            'input[type="text"], input:not([type])',
        )
        inputs?.[inputs.length - 1]?.focus()
    }

    function removeFlavor(index: number) {
        formFlavors = formFlavors.filter((_, i) => i !== index)
    }

    function updateFlavor(index: number, value: string) {
        formFlavors = formFlavors.map((f, i) =>
            i === index ? { ...f, name: value } : f,
        )
    }

    async function addSize() {
        formSizes = [
            ...formSizes,
            { _key: nextSizeKey++, name: '', price: '' },
        ]
        await tick()
        const list = document.getElementById('pf-size-list')
        const inputs = list?.querySelectorAll<HTMLInputElement>(
            'input[type="text"], input:not([type])',
        )
        inputs?.[inputs.length - 1]?.focus()
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

        if (imageObjectId !== '' && !imageIsCommitted) return

        const validFlavors = formFlavors
            .filter((f) => f.name.trim())
            .map(({ name }) => ({ name: name.trim() }))

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
            flavors: validFlavors,
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

<main class="flex flex-1 flex-col gap-6 p-4 pt-2 md:p-6">
    <!-- Header -->
    <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
            <div
                class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20"
            >
                <PackageIcon class="size-5 text-blue-400" />
            </div>
            <div>
                <h1 class="text-xl font-bold tracking-tight">Products</h1>
                <p class="text-muted-foreground text-sm">
                    {#if productsQuery.data}
                        {@const shown = filteredProducts.length}
                        {@const total = productsQuery.data.length}
                        {@const available = filteredProducts.filter(
                            (p) => p.isAvailable,
                        ).length}
                        {#if categoryFilter}
                            {shown} of {total}
                            {total === 1 ? 'item' : 'items'} &middot; {available}
                            available
                        {:else}
                            {total}
                            {total === 1 ? 'item' : 'items'} &middot; {available}
                            available
                        {/if}
                    {:else}
                        Manage your ordering system products.
                    {/if}
                </p>
            </div>
        </div>
        <Button
            onclick={openCreateDialog}
            class="gap-2 bg-blue-600 text-white hover:bg-blue-500"
        >
            <PlusIcon class="size-4" />
            Add Product
        </Button>
    </div>

    <Separator class="border-zinc-800" />

    <!-- Category filter pills -->
    <div class="flex flex-wrap gap-2">
        <button
            type="button"
            onclick={() => (categoryFilter = null)}
            class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors {categoryFilter ===
            null
                ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                : 'border-zinc-700 bg-transparent text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'}"
        >
            All
            {#if productsQuery.data}
                <span class="ml-1.5 tabular-nums opacity-60"
                    >{productsQuery.data.length}</span
                >
            {/if}
        </button>
        {#each CATEGORY_OPTIONS as opt (opt.value)}
            {@const count =
                productsQuery.data?.filter((p) => p.category === opt.value)
                    .length ?? null}
            <button
                type="button"
                onclick={() => (categoryFilter = opt.value)}
                class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors {categoryFilter ===
                opt.value
                    ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                    : 'border-zinc-700 bg-transparent text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'}"
            >
                <span class="size-1.5 rounded-full {CATEGORY_COLORS[opt.value]}"
                ></span>
                {opt.label}
                {#if count !== null}
                    <span class="tabular-nums opacity-60">{count}</span>
                {/if}
            </button>
        {/each}
    </div>

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

        <!-- Empty — no products at all -->
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

        <!-- Empty — filter has no results -->
    {:else if filteredProducts.length === 0}
        <div
            class="flex flex-1 flex-col items-center justify-center gap-3 py-24 text-center"
        >
            <div class="bg-muted rounded-full p-4">
                <ShoppingBagIcon class="text-muted-foreground size-6" />
            </div>
            <div>
                <p class="font-medium">
                    No {CATEGORY_LABELS[categoryFilter!]} products
                </p>
                <p class="text-muted-foreground mt-0.5 text-sm">
                    Try a different category or
                    <button
                        type="button"
                        onclick={() => (categoryFilter = null)}
                        class="text-blue-400 underline-offset-2 hover:underline"
                        >view all</button
                    >.
                </p>
            </div>
        </div>

        <!-- Grid -->
    {:else}
        <div
            class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
            {#each filteredProducts as p (p.id)}
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
                                class="text-muted-foreground line-clamp-2 text-xs/relaxed"
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
<Dialog.Root
    bind:open={dialogOpen}
    onOpenChange={(isOpen) => {
        if (!isOpen) {
            imageIsCommitted = false
            imageObjectId = ''
        }
    }}
>
    <Dialog.Content
        class="flex max-h-[90dvh] w-full flex-col overflow-hidden p-0 bg-zinc-950 border-zinc-800/80 shadow-2xl shadow-black/60 sm:max-w-2xl"
    >
        <!-- Header -->
        <div
            class="flex shrink-0 items-center gap-3 px-5 pt-5 pb-4 pr-12 border-b border-zinc-800"
        >
            <div
                class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20"
            >
                {#if editingProduct}
                    <PencilIcon class="size-4.5 text-blue-400" />
                {:else}
                    <ShoppingBagIcon class="size-4.5 text-blue-400" />
                {/if}
            </div>
            <div class="min-w-0">
                <Dialog.Title class="text-sm/tight font-semibold text-zinc-100">
                    {editingProduct ? 'Edit Product' : 'Add Product'}
                </Dialog.Title>
                <Dialog.Description class="mt-0.5 text-xs text-zinc-500">
                    {editingProduct
                        ? `Editing "${editingProduct.name}"`
                        : 'Fill in the product details below.'}
                </Dialog.Description>
            </div>
        </div>

        <!-- Scrollable body -->
        <form
            id="product-form"
            class="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-x-hidden overflow-y-auto sm:grid-cols-2"
            onsubmit={handleSubmit}
        >
            <!-- LEFT COLUMN: image, core fields, tags, available -->
            <div
                class="flex flex-col gap-4 border-b border-zinc-800 px-5 py-4 sm:border-b-0 sm:border-r sm:border-zinc-800"
            >
                <!-- Image — full width so the 4:3 aspect ratio has room -->
                {#if formInitialImageUrl && imageObjectId === '' && !imageIsCommitted}
                    <div
                        class="aspect-video overflow-hidden rounded-lg border border-border"
                    >
                        <img
                            src={formInitialImageUrl}
                            alt={formName}
                            class="size-full object-cover"
                        />
                    </div>
                {/if}
                <SingleFileUpload
                    allowedMimeTypes={[
                        'image/jpeg',
                        'image/png',
                        'image/webp',
                        'image/gif',
                    ]}
                    isPublic={true}
                    autoCommit={true}
                    bind:isCommitted={imageIsCommitted}
                    bind:objectId={imageObjectId}
                    onCommit={(data) => {
                        formImageObjectStorageId = data.attachments[0]
                    }}
                />

                <!-- Name / Category / Price -->
                <div class="flex flex-col gap-2.5">
                    <div class="flex flex-col gap-1">
                        <Label
                            for="pf-name"
                            class="text-xs font-medium">Product Name</Label
                        >
                        <Input
                            id="pf-name"
                            placeholder="e.g. Chicken Wings"
                            required
                            maxlength={128}
                            bind:value={formName}
                            class="h-9 text-sm"
                        />
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <div class="flex flex-col gap-1">
                            <Label class="text-xs font-medium">Category</Label>
                            <Select.Root
                                type="single"
                                value={formCategory}
                                onValueChange={(v: string | undefined) =>
                                    (formCategory = (v ??
                                        formCategory) as TCategory)}
                            >
                                <Select.Trigger class="h-9 w-full text-sm">
                                    <div
                                        class="flex min-w-0 items-center gap-2"
                                    >
                                        <span
                                            class="size-2 shrink-0 rounded-full {CATEGORY_COLORS[
                                                formCategory
                                            ]}"
                                        ></span>
                                        <span class="truncate"
                                            >{CATEGORY_LABELS[
                                                formCategory
                                            ]}</span
                                        >
                                    </div>
                                </Select.Trigger>
                                <Select.Content>
                                    {#each CATEGORY_OPTIONS as opt (opt.value)}
                                        <Select.Item value={opt.value}>
                                            <div
                                                class="flex items-center gap-2"
                                            >
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
                        <div class="flex flex-col gap-1">
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
                                    class="h-9 pl-7 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Ingredients -->
                <div class="flex flex-col gap-1">
                    <Label
                        for="pf-ingredients"
                        class="text-xs font-medium"
                    >
                        Ingredients <span
                            class="text-muted-foreground font-normal"
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
                <div class="flex flex-col gap-1.5">
                    <Label class="text-xs font-medium">
                        Tags <span class="text-muted-foreground font-normal"
                            >(optional)</span
                        >
                    </Label>
                    <div class="flex flex-wrap gap-x-3 gap-y-1.5">
                        {#each TAG_OPTIONS as tag (tag)}
                            <label
                                class="flex cursor-pointer select-none items-center gap-1.5"
                            >
                                <Checkbox
                                    checked={formTags.includes(tag)}
                                    onCheckedChange={(v) =>
                                        (formTags = v
                                            ? [...formTags, tag]
                                            : formTags.filter(
                                                  (t) => t !== tag,
                                              ))}
                                />
                                <span class="text-xs">{TAG_LABELS[tag]}</span>
                            </label>
                        {/each}
                    </div>
                </div>

                <!-- Available toggle -->
                <div
                    class="flex items-center gap-3 rounded-lg border border-zinc-700/50 bg-zinc-800/30 px-3 py-2.5"
                >
                    <Checkbox
                        id="pf-status"
                        bind:checked={formIsAvailable}
                    />
                    <div>
                        <Label
                            for="pf-status"
                            class="cursor-pointer text-xs font-medium"
                            >Available</Label
                        >
                        <p class="text-muted-foreground text-[11px]">
                            Show this product to customers
                        </p>
                    </div>
                </div>
            </div>

            <!-- RIGHT COLUMN: flavors + sizes -->
            <div class="flex flex-col gap-4 px-5 py-4">
                <!-- Flavors -->
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between">
                        <div>
                            <Label class="text-xs font-medium">Flavors</Label>
                            <p class="text-muted-foreground text-[11px]">
                                e.g. Buffalo, Cheese, Garlic Parmesan
                            </p>
                        </div>
                        {#if formFlavors.length > 0}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onclick={addFlavor}
                                class="h-6 gap-1 px-2 text-xs"
                            >
                                <PlusIcon class="size-3" />
                                Add
                            </Button>
                        {/if}
                    </div>

                    {#if formFlavors.length === 0}
                        <button
                            type="button"
                            onclick={addFlavor}
                            class="border-muted-foreground/20 hover:border-muted-foreground/35 hover:bg-muted/40 flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-3 text-center transition-colors"
                        >
                            <PlusIcon class="text-muted-foreground size-3.5" />
                            <span class="text-muted-foreground text-xs">
                                No flavors. Tap to add one.
                            </span>
                        </button>
                    {:else}
                        <div
                            id="pf-flavor-list"
                            class="flex flex-col gap-1"
                        >
                            {#each formFlavors as flavor, i (flavor._key)}
                                <div
                                    class="bg-muted/40 flex items-center gap-1.5 rounded-lg px-2 py-1"
                                >
                                    <Input
                                        placeholder="e.g. Buffalo"
                                        maxlength={64}
                                        value={flavor.name}
                                        oninput={(e: Event) =>
                                            updateFlavor(
                                                i,
                                                (
                                                    e.currentTarget as HTMLInputElement
                                                ).value,
                                            )}
                                        class="h-7 min-w-0 flex-1 border-transparent bg-transparent text-xs shadow-none focus-visible:border-input focus-visible:bg-background"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        class="text-muted-foreground hover:text-destructive size-7 shrink-0"
                                        onclick={() => removeFlavor(i)}
                                    >
                                        <Trash2Icon class="size-3" />
                                    </Button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- Sizes -->
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center justify-between">
                        <div>
                            <Label class="text-xs font-medium"
                                >Sizes & Prices</Label
                            >
                            <p class="text-muted-foreground text-[11px]">
                                Override base price per size.
                            </p>
                        </div>
                        {#if formSizes.length > 0}
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onclick={addSize}
                                class="h-6 gap-1 px-2 text-xs"
                            >
                                <PlusIcon class="size-3" />
                                Add
                            </Button>
                        {/if}
                    </div>

                    {#if formSizes.length === 0}
                        <button
                            type="button"
                            onclick={addSize}
                            class="border-muted-foreground/20 hover:border-muted-foreground/35 hover:bg-muted/40 flex w-full flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-3 text-center transition-colors"
                        >
                            <PlusIcon class="text-muted-foreground size-3.5" />
                            <span class="text-muted-foreground text-xs">
                                No sizes — base price applies. Tap to add a
                                variant.
                            </span>
                        </button>
                    {:else}
                        <div
                            id="pf-size-list"
                            class="flex flex-col gap-1"
                        >
                            {#each formSizes as size, i (size._key)}
                                <div
                                    class="bg-muted/40 grid items-center gap-1.5 rounded-lg px-2 py-1"
                                    style="grid-template-columns: 1fr 5.5rem 1.75rem"
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
                                        class="h-7 min-w-0 border-transparent bg-transparent text-xs shadow-none focus-visible:border-input focus-visible:bg-background"
                                    />
                                    <div class="relative flex items-center">
                                        <span
                                            class="text-muted-foreground pointer-events-none absolute left-2 select-none text-xs"
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
                                            class="h-7 min-w-0 border-transparent bg-transparent pl-5 text-xs shadow-none focus-visible:border-input focus-visible:bg-background"
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        class="text-muted-foreground hover:text-destructive size-7 shrink-0"
                                        onclick={() => removeSize(i)}
                                    >
                                        <Trash2Icon class="size-3" />
                                    </Button>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
        </form>

        <!-- Footer -->
        <div
            class="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-800 bg-zinc-950/80 px-5 py-3.5"
        >
            <Button
                type="button"
                variant="outline"
                size="sm"
                class="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
                onclick={() => (dialogOpen = false)}
                disabled={isMutating}
            >
                Cancel
            </Button>
            <Button
                type="submit"
                form="product-form"
                size="sm"
                disabled={isMutating}
                class="gap-1.5 bg-blue-600 text-white hover:bg-blue-500"
            >
                {#if isMutating}
                    <LoaderCircleIcon class="size-3.5 animate-spin" />
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
    <AlertDialog.Content
        class="bg-zinc-950 border-zinc-800/80 shadow-2xl shadow-black/60 sm:max-w-sm"
    >
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
