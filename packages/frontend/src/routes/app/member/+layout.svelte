<script lang="ts">
    import { onMount } from 'svelte'

    import { goto } from '$app/navigation'
    import Navbar from '$lib/components/Navigation/Navbar.svelte'
    import Sidebar from '$lib/components/Navigation/Sidebar.svelte'
    import { useSessionContext } from '$lib/states/session.svelte.js'

    ////////////////
    // Properties //
    ////////////////

    let { children } = $props()

    //////////////
    // Contexts //
    //////////////

    const session = useSessionContext()

    ////////////////////
    // Initialization //
    ////////////////////

    let renderView = $state(false)

    //////////////
    // Handlers //
    //////////////

    //

    ///////////////
    // Lifecycle //
    ///////////////

    onMount(() => {
        if (session.data?.userRoles.includes('member')) {
            renderView = true
        } else {
            goto(`/app/member/dashboard`, {
                replaceState: true,
            })
        }
    })

    /////////////
    // Classes //
    /////////////

    //
</script>

{#if renderView}
    <Navbar />
    <Sidebar />
    <div
        id="main-content"
        class="relative mt-20 ml-0 h-full w-full overflow-hidden bg-white md:mt-14 xl:ml-64 dark:bg-neutral-800"
    >
        <main class="min-h-screen">
            <section class="relative bg-white p-4 dark:bg-neutral-800">
                <div
                    class="h-auto min-h-[calc(100vh-85px)] rounded-md p-4 dark:bg-neutral-900"
                >
                    {@render children()}
                </div>
            </section>
        </main>
    </div>
{/if}
