<script lang="ts">
    import { IMG_logo } from '$lib/assets/image/index'
</script>

<div
    aria-label="Loading"
    role="status"
    class="fixed inset-0 z-50 flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-zinc-950"
>
    <!-- Logo with blue glow ring -->
    <div class="logo-wrap relative flex items-center justify-center">
        <!-- Outer ping ring -->
        <span class="absolute inset-0 rounded-xl bg-blue-500/15 ring-outer"
        ></span>
        <!-- Glow ring -->
        <div
            class="absolute inset-0 rounded-xl bg-blue-500/10 ring-1 ring-blue-400/30 blur-sm"
        ></div>
        <!-- Logo image -->
        <img
            src={IMG_logo}
            alt="Cosina Admin"
            class="relative size-20 rounded-xl object-cover shadow-2xl shadow-blue-950/60"
        />
    </div>

    <!-- Brand name -->
    <div class="flex flex-col items-center gap-1 text-center">
        <h1 class="text-xl font-bold tracking-tight text-zinc-100">Cosina</h1>
        <p class="text-xs font-medium text-blue-400/70">Admin Dashboard</p>
        <p class="mt-1 text-xs text-zinc-600">Loading, please wait…</p>
    </div>

    <!-- Bouncing blue dots -->
    <div
        class="flex items-center gap-2"
        aria-hidden="true"
    >
        <span class="dot dot-1 size-1.5 rounded-full bg-blue-400"></span>
        <span class="dot dot-2 size-1.5 rounded-full bg-blue-400"></span>
        <span class="dot dot-3 size-1.5 rounded-full bg-blue-400"></span>
    </div>
</div>

<style>
    /* Logo breathing pulse */
    .logo-wrap {
        animation: logo-breathe 2.8s ease-in-out infinite;
    }

    @keyframes logo-breathe {
        0%,
        100% {
            transform: scale(1);
            filter: drop-shadow(0 0 0px rgb(96 165 250 / 0));
        }
        50% {
            transform: scale(1.04);
            filter: drop-shadow(0 0 16px rgb(96 165 250 / 0.4));
        }
    }

    /* Outer expanding ring */
    .ring-outer {
        animation: ring-expand 2.8s ease-out infinite;
        opacity: 0;
    }

    @keyframes ring-expand {
        0% {
            transform: scale(1);
            opacity: 0.4;
        }
        80% {
            transform: scale(1.55);
            opacity: 0;
        }
        100% {
            transform: scale(1.55);
            opacity: 0;
        }
    }

    /* Staggered bounce dots */
    .dot {
        animation: dot-bounce 1.2s ease-in-out infinite;
    }

    .dot-1 {
        animation-delay: 0s;
    }
    .dot-2 {
        animation-delay: 0.2s;
    }
    .dot-3 {
        animation-delay: 0.4s;
    }

    @keyframes dot-bounce {
        0%,
        80%,
        100% {
            transform: translateY(0);
            opacity: 0.35;
        }
        40% {
            transform: translateY(-6px);
            opacity: 1;
        }
    }
</style>
