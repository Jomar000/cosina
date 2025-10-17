<script lang="ts">
    import { getContext, onMount } from 'svelte'

    import { goto } from '$app/navigation'
    import Navbar from '$lib/components/Navigation/Navbar.svelte'
    import Sidebar from '$lib/components/Navigation/Sidebar.svelte'

    ////////////////
    // Properties //
    ////////////////

    let { children } = $props()

    ////////////////////
    // Initialization //
    ////////////////////

    const sessionData = getContext<TSessionData>('sessionData')

    let renderView = $state(false)

    //////////////
    // Handlers //
    //////////////

    //

    ///////////////
    // Lifecycle //
    ///////////////

    onMount(() => {
        if (sessionData.userRoles.includes('member')) {
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

    const siClass =
        'flex w-full items-center rounded-lg p-2 text-sm font-normal text-neutral-900 transition duration-75 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-white'
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
