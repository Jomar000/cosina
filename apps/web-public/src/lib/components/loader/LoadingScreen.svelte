<script lang="ts">
    import logoImg from '$lib/assets/image/logo.jpg'
</script>

<div class="flex h-screen w-full items-center justify-center">
    <div class="logo-loader">
        <div class="spin-ring"></div>
        <img
            src={logoImg}
            alt="Cosina ni Cacai"
            class="logo-img"
        />
    </div>
</div>

<style>
    .logo-loader {
        position: relative;
        width: 96px;
        height: 96px;
    }

    .logo-img {
        position: absolute;
        inset: 12px;
        border-radius: 50%;
        object-fit: cover;
        animation: pulse 2s ease-in-out infinite;
    }

    .spin-ring {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        border: 3px solid oklch(1 0 0 / 10%);
        border-top-color: var(--sidebar-primary);
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.7;
        }
    }
</style>
