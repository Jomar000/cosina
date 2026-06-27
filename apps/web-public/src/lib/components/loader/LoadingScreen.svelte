<script lang="ts">
    import { IMG_logo } from '$lib/assets/image/index'
</script>

<div
    aria-label="Loading"
    role="status"
    class="fixed inset-0 z-50 flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-zinc-950"
>
    <!-- Logo with warm glow ring -->
    <div class="logo-wrap relative flex items-center justify-center">
        <!-- Outer ping ring -->
        <span class="absolute inset-0 rounded-2xl bg-amber-400/20 ring-outer"
        ></span>
        <!-- Glow ring -->
        <div
            class="absolute inset-0 rounded-2xl bg-amber-500/10 ring-1 ring-amber-400/30 blur-sm"
        ></div>
        <!-- Logo image -->
        <img
            src={IMG_logo}
            alt="Cosina"
            class="relative size-24 rounded-2xl object-cover shadow-2xl shadow-amber-900/40"
        />
    </div>

    <!-- Brand name -->
    <div class="flex flex-col items-center gap-1.5 text-center">
        <h1 class="text-2xl font-bold tracking-tight text-zinc-100">Cosina</h1>
        <p class="text-sm text-zinc-500">Preparing your experience…</p>
    </div>

    <!-- Bouncing amber dots -->
    <div
        class="flex items-center gap-2"
        aria-hidden="true"
    >
        <span class="dot dot-1 size-2 rounded-full bg-amber-400"></span>
        <span class="dot dot-2 size-2 rounded-full bg-amber-400"></span>
        <span class="dot dot-3 size-2 rounded-full bg-amber-400"></span>
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
            filter: drop-shadow(0 0 0px rgb(251 191 36 / 0));
        }
        50% {
            transform: scale(1.04);
            filter: drop-shadow(0 0 18px rgb(251 191 36 / 0.45));
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
            opacity: 0.5;
        }
        80% {
            transform: scale(1.5);
            opacity: 0;
        }
        100% {
            transform: scale(1.5);
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
            opacity: 0.4;
        }
        40% {
            transform: translateY(-7px);
            opacity: 1;
        }
    }
</style>
