import type { Component } from 'svelte'

export interface AppNavItem {
    title: string
    url?: string
    icon: Component
    disabled?: boolean
    exact?: boolean
    badge?: number
    children?: AppNavItem[]
}

export interface AppRouteMeta {
    title: string
    breadcrumb?: string[]
}
