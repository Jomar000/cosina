<script lang="ts">
    import { onMount } from 'svelte'

    import { goto } from '$app/navigation'
    import { PUBLIC_NAME } from '$env/static/public'
    import bgLoginImg from '$lib/assets/image/bgLogin1.png'
    import logoImg from '$lib/assets/image/logo.jpg'
    import CaptchaModal from '$lib/components/modal/CaptchaModal.svelte'
    import LoadingScreen from '$lib/components/loader/LoadingScreen.svelte'
    import SignInForm from '$lib/modules/auth/components/SignInForm.svelte'
    import { useSessionContext } from '$lib/states/session'

    ///////////////
    // 03. State //
    ///////////////

    const session = useSessionContext()

    let render = $state(false)

    let showCaptchaModal = $state(false)

    let showLoader = $state(false)

    /////////////////
    // 08. Effects //
    /////////////////

    onMount(() => {
        if (!session.isValid()) {
            render = true
        } else {
            if (session.data.userRoles.length === 1) {
                goto(`/app/${session.data.userRoles[0]}/dashboard`)
            } else {
                goto('/app')
            }
        }
    })
</script>

<svelte:head>
    <title>Sign-in | {PUBLIC_NAME}</title>
</svelte:head>

{#if render}
    <div class="relative flex min-h-svh overflow-hidden">
        <!-- Full-page background image -->
        <img
            src={bgLoginImg}
            alt=""
            aria-hidden="true"
            class="absolute inset-0 size-full object-cover object-center"
        />
        <!-- Unified dark scrim over the whole page -->
        <div
            class="absolute inset-0 bg-linear-to-r from-[#04041a]/92 via-[#07073a]/70 to-[#04041a]/85"
        ></div>

        <!-- Left brand content — visible lg+ -->
        <div
            class="relative z-10 hidden lg:flex lg:w-1/2 xl:w-3/5 flex-col justify-between p-12"
        >
            <div class="flex items-center gap-3">
                <div
                    class="rounded-full shadow-[0_0_24px_rgba(99,102,241,0.4)] ring-2 ring-white/25"
                >
                    <img
                        src={logoImg}
                        alt="{PUBLIC_NAME} logo"
                        class="size-11 rounded-full object-cover"
                    />
                </div>
                <span
                    class="text-base font-semibold tracking-wide text-white/90"
                    >{PUBLIC_NAME}</span
                >
            </div>

            <div class="flex flex-col gap-3">
                <p class="text-3xl/snug font-bold text-white">
                    "Manage your kitchen <br />with confidence."
                </p>
                <p class="text-sm text-blue-200/60">
                    Your complete backoffice for orders, inventory, and more.
                </p>
            </div>
        </div>

        <!-- Right sign-in panel — glass overlay, no solid bg -->
        <div
            class="dark relative z-10 flex w-full flex-col items-center justify-center px-6 py-14 lg:w-1/2 xl:w-2/5"
        >
            <div class="flex w-full max-w-sm flex-col items-center gap-8">
                <!-- Logo + brand identity -->
                <div class="flex flex-col items-center gap-4 text-center">
                    <div
                        class="rounded-full shadow-[0_0_48px_rgba(99,102,241,0.25)] ring-4 ring-indigo-500/20"
                    >
                        <img
                            src={logoImg}
                            alt="{PUBLIC_NAME} logo"
                            class="size-24 rounded-full object-cover"
                        />
                    </div>
                    <div>
                        <h1 class="text-xl font-bold tracking-tight text-white">
                            {PUBLIC_NAME}
                        </h1>
                        <p
                            class="mt-1 text-xs font-medium uppercase tracking-widest text-indigo-400/60"
                        >
                            Backoffice Management System
                        </p>
                    </div>
                </div>

                <!-- Sign-in form (dark mode active via parent .dark class) -->
                <SignInForm
                    class="w-full"
                    bind:showCaptchaModal
                    bind:showLoader
                    {session}
                />
            </div>
        </div>
    </div>
    <CaptchaModal open={showCaptchaModal} />

    {#if showLoader}
        <div class="fixed inset-0 z-50 bg-[#04041a]">
            <LoadingScreen />
        </div>
    {/if}
{/if}
