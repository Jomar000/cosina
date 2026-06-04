<script lang="ts">
    import logoImg from '$lib/assets/image/logo.jpg'
</script>

<div class="flex h-screen w-full flex-col items-center justify-center gap-8">
    <div class="loader-wrap">
        <div class="halo"></div>
        <div class="ring ring-outer"></div>
        <div class="ring ring-inner"></div>
        <img
            src={logoImg}
            alt="Cosina ni Cacai"
            class="logo-img"
        />
    </div>

    <p class="loading-label">
        Loading<span
            class="dot"
            style="--i:0">.</span
        ><span
            class="dot"
            style="--i:1">.</span
        ><span
            class="dot"
            style="--i:2">.</span
        >
    </p>
</div>

<style>
    .loader-wrap {
        position: relative;
        width: 160px;
        height: 160px;
    }

    /* ambient glow behind the entire ring set */
    .halo {
        position: absolute;
        inset: -20px;
        border-radius: 50%;
        background: radial-gradient(
            circle,
            rgba(99, 102, 241, 0.2) 0%,
            transparent 70%
        );
        animation: halo-pulse 2.4s ease-in-out infinite;
    }

    .ring {
        position: absolute;
        border-radius: 50%;
        border-style: solid;
        border-color: transparent;
    }

    /* outer ring — slow, counter-clockwise, subtle */
    .ring-outer {
        inset: -12px;
        border-width: 2px;
        border-top-color: rgba(99, 102, 241, 0.35);
        border-right-color: rgba(59, 130, 246, 0.2);
        animation: spin-ccw 2.4s linear infinite;
    }

    /* inner ring — faster, clockwise, vivid gradient arc */
    .ring-inner {
        inset: 0;
        border-width: 3px;
        border-top-color: #6366f1;
        border-right-color: #3b82f6;
        border-bottom-color: rgba(99, 102, 241, 0.1);
        animation: spin-cw 1s linear infinite;
    }

    /* Logo: explicit size + transform centering = pixel-perfect alignment */
    .logo-img {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 124px;
        height: 124px;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        object-fit: cover;
        box-shadow:
            0 0 0 2px rgba(99, 102, 241, 0.3),
            0 0 24px rgba(99, 102, 241, 0.45),
            0 4px 20px rgba(0, 0, 0, 0.5);
        animation: logo-pulse 2.4s ease-in-out infinite;
    }

    .loading-label {
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: rgba(147, 197, 253, 0.6);
    }

    .dot {
        display: inline-block;
        animation: dot-fade 1.4s ease-in-out infinite;
        animation-delay: calc(var(--i) * 0.2s);
    }

    @keyframes spin-cw {
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes spin-ccw {
        to {
            transform: rotate(-360deg);
        }
    }

    @keyframes logo-pulse {
        0%,
        100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        50% {
            opacity: 0.88;
            transform: translate(-50%, -50%) scale(0.965);
        }
    }

    @keyframes halo-pulse {
        0%,
        100% {
            opacity: 0.6;
            transform: scale(1);
        }
        50% {
            opacity: 1;
            transform: scale(1.1);
        }
    }

    @keyframes dot-fade {
        0%,
        60%,
        100% {
            opacity: 0.2;
        }
        30% {
            opacity: 1;
        }
    }
</style>
