<script lang="ts">
    import * as Breadcrumb from '@hyperion/ui/components/breadcrumb'
    import { Separator } from '@hyperion/ui/components/separator'
    import * as Sidebar from '@hyperion/ui/components/sidebar'
</script>

<!-- BREADCRUMB -->
<header
    class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12"
>
    <div class="flex items-center gap-2 px-4">
        <Sidebar.Trigger class="-ml-1" />
        <Separator
            orientation="vertical"
            class="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb.Root>
            <Breadcrumb.List>
                <Breadcrumb.Item class="hidden md:block">
                    <Breadcrumb.Link href="##">Dashboard</Breadcrumb.Link>
                </Breadcrumb.Item>
            </Breadcrumb.List>
        </Breadcrumb.Root>
    </div>
</header>

<!-- CONTENT -->
<main class="flex flex-1 flex-col gap-4 p-4 pt-0">MEMBER DASHBOARD</main>
