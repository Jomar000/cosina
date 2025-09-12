<div class="flex h-screen w-full items-center justify-center">
    <div class="wrapper">
        <div class="blue ball"></div>
        <div class="red ball"></div>
        <div class="yellow ball"></div>
        <div class="green ball"></div>
    </div>
</div>

<style>
    .wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .ball {
        --size: 16px;
        width: var(--size);
        height: var(--size);
        border-radius: 11px;
        margin: 0 10px;

        animation: 2s bounce ease infinite;
    }

    .blue {
        background-color: #4285f5;
    }

    .red {
        background-color: #ea4436;
        animation-delay: 0.25s;
    }

    .yellow {
        background-color: #fbbd06;
        animation-delay: 0.5s;
    }

    .green {
        background-color: #34a952;
        animation-delay: 0.75s;
    }

    @keyframes bounce {
        50% {
            transform: translateY(25px);
        }
    }
</style>
