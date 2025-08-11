<!-- TODO: REVAMP -->

<script lang="ts">
    import { userSignInInputSchema } from '@hyperion/validator/internal/user'
    import { createForm } from '@tanstack/svelte-form'
    import { getContext } from 'svelte'

    import { Button, Dialog, Separator } from 'bits-ui'

    ////////////////////
    // Initialization //
    ////////////////////
    const sessionData = getContext<TSessionData>('sessionData')

    // Generic
    let renderPage = $state(false)
    let showCaptchaModal = $state(false)
    let showCurrentPassword = $state(false)
    let showNewPassword = $state(false)
    let submissionErrors: string[] = $state([])
    let showVerifyPassword = $state(false)

    let { changePasswordModal = $bindable() } = $props()
    const handleCloseModal = () => {
        changePasswordModal = false
    }

    // Form
    const {
        Field: UserChangePasswordField,
        Subscribe: UserChangePasswordSubscribe,
        handleSubmit: userChangePasswordFormHandleSubmit,
    } = createForm(() => ({
        defaultValues: {
            captchaToken: '',
            currentPassword: '',
            newPassword: '',
            verifyPassword: '',
        },
    }))

    const inputClassDefault =
        'block w-full rounded-lg border-neutral-300 bg-neutral-100 p-2.5 text-sm text-neutral-900 focus:border-orange-500 focus:ring-orange-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder-neutral-400'
    const inputClassError = `${inputClassDefault} border-2 border-red-700 dark:border-red-700`
</script>

<Dialog.Root open={changePasswordModal}>
    <Dialog.Portal>
        <Dialog.Overlay
            class="data-[state=open]:animate-in data-[state=closed]:animate-out
            data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0
            fixed inset-0 z-50 bg-black/80"
        />
        <Dialog.Content
            interactOutsideBehavior="ignore"
            class="outline-hidden fixed left-[50%]
                top-[50%] z-50
                 h-auto w-full  max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] overflow-auto rounded-lg
                border border-neutral-300 bg-neutral-100  p-5 text-neutral-800 shadow
                md:w-1/4 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 "
        >
            <Dialog.Title
                class="flex w-full items-center justify-center text-lg font-semibold tracking-tight"
            >
                Change Password
            </Dialog.Title>
            <Dialog.Close
                class="focus-visible:ring-foreground focus-visible:ring-offset-background focus-visible:outline-hidden absolute right-5 top-5 rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]"
            >
                <button
                    aria-label="button"
                    onclick={handleCloseModal}
                    type="button"
                    class="cursor-pointer rounded-full p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                >
                    <span class="">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            ><path
                                fill="none"
                                stroke="currentColor"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2.5"
                                d="m7 7l10 10M7 17L17 7"
                            /></svg
                        >
                    </span>
                </button>
            </Dialog.Close>

            <Separator.Root
                class="-mx-5 mb-4 mt-5 block h-px bg-neutral-300 dark:bg-neutral-600"
            />

            <div
                class="relative mx-auto w-full rounded-md bg-neutral-100 p-2 dark:bg-neutral-800"
            >
                <div class="m-auto w-full">
                    <form
                        class=" space-y-4 md:space-y-5"
                        onsubmit={(e: SubmitEvent) => {
                            e.preventDefault()
                            e.stopPropagation()
                            userChangePasswordFormHandleSubmit()
                        }}
                    >
                        <UserChangePasswordField
                            name="currentPassword"
                            validators={{
                                onBlur: ({ value }) => {
                                    const { error } =
                                        userSignInInputSchema.shape.password.safeParse(
                                            value,
                                        )

                                    return error
                                        ? error.issues[0].message
                                        : undefined
                                },
                            }}
                        >
                            {#snippet children(field)}
                                {@const { isValid, errors } = field.state.meta}
                                <label
                                    for="currentPassword"
                                    class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                                >
                                    Current Password
                                </label>
                                <div class="relative">
                                    <input
                                        name={field.name}
                                        type={showCurrentPassword
                                            ? 'text'
                                            : 'password'}
                                        value={field.state.value}
                                        class={errors.length > 0
                                            ? inputClassError
                                            : inputClassDefault}
                                        placeholder="●●●●●●●●●●●●"
                                        onblur={field.handleBlur}
                                        oninput={(e) =>
                                            field.handleChange(
                                                e.currentTarget.value,
                                            )}
                                    />
                                    <button
                                        type="button"
                                        class="pointer-events-auto absolute right-2.5 top-2.5 focus:outline-none"
                                        onclick={() =>
                                            (showCurrentPassword =
                                                !showCurrentPassword)}
                                        tabindex={-1}
                                    >
                                        {#if showCurrentPassword}
                                            <i
                                                class="ph-bold ph-eye text-neutral-900 dark:text-neutral-200"
                                            ></i>
                                        {:else}
                                            <i
                                                class="ph-bold ph-eye-closed text-neutral-900 dark:text-neutral-200"
                                            ></i>
                                        {/if}
                                    </button>
                                    {#if !isValid}
                                        <div
                                            class="flex items-center justify-start"
                                        >
                                            <span
                                                class="text-sm font-semibold text-red-500"
                                            >
                                                {errors.join('\n')}
                                            </span>
                                        </div>
                                    {/if}
                                </div>
                            {/snippet}
                        </UserChangePasswordField>

                        <UserChangePasswordField
                            name="newPassword"
                            validators={{
                                onBlur: ({ value }) => {
                                    const { error } =
                                        userSignInInputSchema.shape.password.safeParse(
                                            value,
                                        )

                                    return error
                                        ? error.issues[0].message
                                        : undefined
                                },
                            }}
                        >
                            {#snippet children(field)}
                                {@const { isValid, errors } = field.state.meta}
                                <label
                                    for="newPassword"
                                    class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                                >
                                    New Password
                                </label>
                                <div class="relative">
                                    <input
                                        name={field.name}
                                        type={showNewPassword
                                            ? 'text'
                                            : 'password'}
                                        value={field.state.value}
                                        class={errors.length > 0
                                            ? inputClassError
                                            : inputClassDefault}
                                        placeholder="●●●●●●●●●●●●"
                                        onblur={field.handleBlur}
                                        oninput={(e) =>
                                            field.handleChange(
                                                e.currentTarget.value,
                                            )}
                                    />
                                    <button
                                        type="button"
                                        class="pointer-events-auto absolute right-2.5 top-2.5 focus:outline-none"
                                        onclick={() =>
                                            (showNewPassword =
                                                !showNewPassword)}
                                        tabindex={-1}
                                    >
                                        {#if showNewPassword}
                                            <i
                                                class="ph-bold ph-eye text-neutral-900 dark:text-neutral-200"
                                            ></i>
                                        {:else}
                                            <i
                                                class="ph-bold ph-eye-closed text-neutral-900 dark:text-neutral-200"
                                            ></i>
                                        {/if}
                                    </button>
                                    {#if !isValid}
                                        <div
                                            class="flex items-center justify-start"
                                        >
                                            <span
                                                class="text-sm font-semibold text-red-500"
                                            >
                                                {errors.join('\n')}
                                            </span>
                                        </div>
                                    {/if}
                                </div>
                            {/snippet}
                        </UserChangePasswordField>
                        <UserChangePasswordField
                            name="verifyPassword"
                            validators={{
                                onBlur: ({ value }) => {
                                    const { error } =
                                        userSignInInputSchema.shape.password.safeParse(
                                            value,
                                        )

                                    return error
                                        ? error.issues[0].message
                                        : undefined
                                },
                            }}
                        >
                            {#snippet children(field)}
                                {@const { isValid, errors } = field.state.meta}
                                <label
                                    for="verifyPassword"
                                    class="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
                                >
                                    Verify Password
                                </label>
                                <div class="relative">
                                    <input
                                        name={field.name}
                                        type={showVerifyPassword
                                            ? 'text'
                                            : 'password'}
                                        value={field.state.value}
                                        class={errors.length > 0
                                            ? inputClassError
                                            : inputClassDefault}
                                        placeholder="●●●●●●●●●●●●"
                                        onblur={field.handleBlur}
                                        oninput={(e) =>
                                            field.handleChange(
                                                e.currentTarget.value,
                                            )}
                                    />
                                    <button
                                        type="button"
                                        class="pointer-events-auto absolute right-2.5 top-2.5 focus:outline-none"
                                        onclick={() =>
                                            (showVerifyPassword =
                                                !showVerifyPassword)}
                                        tabindex={-1}
                                    >
                                        {#if showVerifyPassword}
                                            <i
                                                class="ph-bold ph-eye text-neutral-900 dark:text-neutral-200"
                                            ></i>
                                        {:else}
                                            <i
                                                class="ph-bold ph-eye-closed text-neutral-900 dark:text-neutral-200"
                                            ></i>
                                        {/if}
                                    </button>
                                    {#if !isValid}
                                        <div
                                            class="flex items-center justify-start"
                                        >
                                            <span
                                                class="text-sm font-semibold text-red-500"
                                            >
                                                {errors.join('\n')}
                                            </span>
                                        </div>
                                    {/if}
                                </div>
                            {/snippet}
                        </UserChangePasswordField>

                        <Button.Root
                            type="submit"
                            class="w-full rounded-lg  bg-blue-600 px-5 py-2.5 text-center text-sm font-medium  text-white hover:bg-blue-700  focus:outline-none focus:ring-4 focus:ring-blue-800"
                            >Save new password</Button.Root
                        >
                    </form>
                </div>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
