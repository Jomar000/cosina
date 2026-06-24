export type TCartItem = {
    key: number
    productId?: number
    name: string
    sizeName?: string
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
    sizes: { id: number; name: string; price: string }[]
}
