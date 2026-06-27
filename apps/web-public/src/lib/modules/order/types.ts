export type TCartItem = {
    key: number
    productId?: number
    name: string
    sizeName?: string
    flavorName?: string
    quantity: number
    price: string
    imageUrl?: string | null
}

export type TProductTag = 'new' | 'best_seller' | 'seasonal' | 'limited'

export type TProduct = {
    id: number
    publicId: string
    name: string
    ingredients: string | null
    category: 'bilao_package' | 'bundle_package' | 'single_order'
    price: string
    imageObjectStorageId: string | null
    imageUrl: string | null
    isAvailable: boolean
    tags: TProductTag[]
    flavors: { id: number; name: string }[]
    sizes: { id: number; name: string; price: string }[]
}
