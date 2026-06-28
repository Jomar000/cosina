import ActivitySquareIcon from '@lucide/svelte/icons/activity-square'
import BarChart3Icon from '@lucide/svelte/icons/bar-chart-3'
import DownloadIcon from '@lucide/svelte/icons/download'
import FolderIcon from '@lucide/svelte/icons/folder'
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard'
import MessageSquareIcon from '@lucide/svelte/icons/message-square'
import SettingsIcon from '@lucide/svelte/icons/settings'
import TablePropertiesIcon from '@lucide/svelte/icons/table-properties'
import UploadIcon from '@lucide/svelte/icons/upload'

import type { AppNavItem, AppRouteMeta } from './types'

export function createRoleNavigation(role: string): AppNavItem[] {
    if (role === 'member') return []

    const prefix = `/app/${role}`

    return [
        {
            title: 'Dashboard',
            url: `${prefix}/dashboard`,
            icon: LayoutDashboardIcon,
        },
        {
            title: 'Workspace',
            icon: FolderIcon,
            children: [
                {
                    title: 'Downloads',
                    url: `${prefix}/object-storage/download`,
                    icon: DownloadIcon,
                },
                {
                    title: 'Uploads',
                    url: `${prefix}/object-storage/upload`,
                    icon: UploadIcon,
                },
            ],
        },
        {
            title: 'Customer Feedback',
            url: `${prefix}/feedback`,
            icon: MessageSquareIcon,
        },
        { title: 'Records', icon: TablePropertiesIcon, disabled: true },
        { title: 'Reports', icon: BarChart3Icon, disabled: true },
        { title: 'Settings', icon: SettingsIcon, disabled: true },
        { title: 'Activity Logs', icon: ActivitySquareIcon, disabled: true },
    ]
}

export function getRouteMeta(pathname: string): AppRouteMeta {
    if (pathname.endsWith('/object-storage/download')) {
        return {
            title: 'Downloads',
            breadcrumb: [
                'Workspace',
                'Downloads',
            ],
        }
    }

    if (pathname.endsWith('/object-storage/upload')) {
        return {
            title: 'Uploads',
            breadcrumb: [
                'Workspace',
                'Uploads',
            ],
        }
    }

    if (pathname === '/app') {
        return { title: 'Role Selection' }
    }

    if (pathname.endsWith('/feedback')) {
        return { title: 'Customer Feedback', breadcrumb: ['Customer Feedback'] }
    }

    return { title: 'Dashboard' }
}
