<script lang="ts">
    import { PUBLIC_NAME } from '$env/static/public'
    import { IMG_lvb2 } from '$lib/assets/image/_index.js'
</script>

<svelte:head>
    <title>404 | {PUBLIC_NAME}</title>
</svelte:head>

<div
    class="relative flex h-screen items-center overflow-hidden bg-neutral-200 p-5 lg:p-20"
>
    <div
        class="relative h-full w-full flex-1 items-center rounded-xl bg-white p-10 text-center text-gray-800 shadow-xl md:flex md:text-left lg:p-20"
    >
        <div class="z-50 w-full md:w-1/2">
            <div class="mb-10 font-light text-gray-600 md:mb-20">
                <h1
                    class="text-5xl font-black uppercase text-neutral-500 lg:text-8xl"
                >
                    404
                </h1>
                <h1
                    class="mb-10 text-3xl font-black uppercase text-neutral-500 lg:text-5xl"
                >
                    NOT FOUND
                </h1>
                <p class="font-semibold text-neutral-500">
                    You've reached a dead end. The page is gone — much like a
                    love that faded without reason. But don't worry, better
                    pages (and people) are ahead.
                </p>
            </div>
            <div class=" mb-0 flex w-full justify-center md:justify-start">
                <button
                    class="flex transform cursor-pointer items-center text-sm font-light text-neutral-500 outline-none transition-all hover:scale-110 hover:text-neutral-600 focus:outline-none md:text-lg"
                    ><span class=" mr-1"
                        ><svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20px"
                            height="20px"
                            viewBox="0 0 32 32"
                            ><path
                                fill="currentColor"
                                d="M20.834 8.037L9.64 14.5c-1.43.824-1.43 2.175 0 3l11.194 6.463c1.43.826 2.598.15 2.598-1.5V9.537c0-1.65-1.17-2.326-2.598-1.5"
                            /></svg
                        ></span
                    >Go Back</button
                >
            </div>
        </div>
        <div
            class="-mt-15 flex w-full items-center justify-center text-center md:mt-0 md:w-1/2"
        >
            <img
                alt="maintenance"
                src={IMG_lvb2}
            />
        </div>
    </div>
</div>
