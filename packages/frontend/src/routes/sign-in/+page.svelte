<script lang="ts">
    import { authSignInInputSchema } from '@hyperion/validator/internal/auth'
    import { createForm } from '@tanstack/svelte-form'
    import { createMutation } from '@tanstack/svelte-query'
    import { onMount, tick } from 'svelte'
    import type { z } from 'zod'

    import { goto } from '$app/navigation'
    import {
        PUBLIC_CF_TURNSTILE_SITE_KEY,
        PUBLIC_NAME,
    } from '$env/static/public'
    import { IMG_default } from '$lib/assets/image/_index.js'
    import Captcha from '$lib/components/Modal/Captcha.svelte'
    import { authClientState } from '$lib/states/auth.svelte.js'
    import { sessionDataState } from '$lib/states/session.svelte.js'
    import { getCookie } from '$lib/utilities.js'

    ////////////////////
    // Initialization //
    ////////////////////

    // Generic
    let renderPage = $state(false)
    let showCaptchaModal = $state(false)
    let showPassword = $state(false)
    let submissionErrors: string[] = $state([])

    // Query
    const authSignInQuery = createMutation(() => ({
        mutationKey: [
            'authSignIn',
        ],
        mutationFn: async (data: z.input<typeof authSignInInputSchema>) => {
            showCaptchaModal = true

            // Wait for DOM update
            await tick()

            // Retrieve CAPTCHA Token
            const captchaToken = await new Promise<string>((resolve) => {
                turnstile.execute('#captchaModalRenderArea', {
                    sitekey: PUBLIC_CF_TURNSTILE_SITE_KEY,
                    callback: (token: string) => {
                        showCaptchaModal = false
                        turnstile.remove('#captchaModalRenderArea')
                        resolve(token)
                    },
                })
            })

            let response:
                | ReturnType<typeof authClientState.value.signIn.email>
                | ReturnType<typeof authClientState.value.signIn.username>
                | null = null

            // Submit Form Data
            try {
                if (data.accountId.includes('@')) {
                    response = await authClientState.value.signIn.email(
                        {
                            email: data.accountId,
                            password: data.password,
                        },
                        {
                            headers: {
                                'x-captcha-response': captchaToken,
                                'x-csrf-token': getCookie('csrf_token') ?? '',
                            },
                            query: { organizationId: data.organizationId },
                        },
                    )
                } else {
                    response = await authClientState.value.signIn.username(
                        {
                            username: data.accountId,
                            password: data.password,
                        },
                        {
                            headers: {
                                'x-captcha-response': captchaToken,
                                'x-csrf-token': getCookie('csrf_token') ?? '',
                            },
                            query: { organizationId: data.organizationId },
                        },
                    )
                }

                if (!response.data) {
                    throw new Error(response.error.message)
                }

                sessionDataState.set(response.data.data)

                if (sessionDataState.value!.userRoles.length === 1) {
                    goto(
                        `/app/${sessionDataState.value!.userRoles[0]}/dashboard`,
                    )
                } else {
                    goto('/app')
                }
            } catch (err) {
                submissionErrors.push((err as Error).message)
            }
        },
    }))

    // Form
    const {
        Field: AuthSignInFormField,
        Subscribe: AuthSignInFormSubscribe,
        handleSubmit: authSignInFormHandleSubmit,
    } = createForm(() => ({
        onSubmit: async ({ value }) => {
            submissionErrors = []
            await authSignInQuery.mutateAsync(value)
        },
        validators: {
            // Make sure form is valid everytime it changes.
            // Error message does not matter, just return a truthy value.
            onChange: ({ value }) => {
                const { error } = authSignInInputSchema.safeParse(value)
                return error
            },
        },
        defaultValues: {
            organizationId: '',
            accountId: '',
            password: '',
        },
    }))

    ///////////////
    // Lifecycle //
    ///////////////

    onMount(() => {
        renderPage =
            sessionDataState.value === null || // Invalid session
            Math.floor(new Date().getTime() / 1000) >= // Expired session
                sessionDataState.value.expiresAt

        if (!renderPage) {
            let activeRole = localStorage.getItem('active_role')

            if (!activeRole) {
                if (sessionDataState.value!.userRoles.length === 1) {
                    activeRole = sessionDataState.value!.userRoles[0]
                }

                goto('/app')
            }

            goto(`/app/${activeRole}/dashboard`)
        }
    })

    /////////////
    // Classes //
    /////////////

    const inputClassDefault =
        'block w-full rounded-lg border-neutral-300 bg-neutral-100 p-2.5 text-sm text-neutral-900 focus:border-orange-500 focus:ring-orange-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200 dark:placeholder-neutral-400'
    const inputClassError = `${inputClassDefault} border-2 border-red-700 dark:border-red-700`
</script>

<svelte:head>
    <title>Sign-in | {PUBLIC_NAME}</title>
</svelte:head>

{#if renderPage}
    <div
        class="flex h-screen flex-wrap bg-neutral-200 dark:dark:bg-neutral-800"
    >
        <div class="flex w-full">
            <div
                class="mx-auto my-auto flex w-full flex-col justify-center px-4"
            >
                <div class="mb-4 flex w-full items-center justify-center">
                    <div class="z-20 flex justify-center">
                        <a
                            href="#"
                            class="flex items-center"
                        >
                            <img
                                src={IMG_default}
                                class="mx-auto w-72"
                                alt="logo"
                            />
                        </a>
                    </div>
                </div>
                <div class="mx-auto w-full max-w-sm xl:p-0">
                    {#if submissionErrors.length > 0}
                        <div class="mb-4">
                            <div
                                role="alert"
                                class="alert alert-vertical alert-outline alert-error sm:alert-horizontal"
                            >
                                <i class="ph-bold ph-info text-lg"></i>
                                <div>
                                    <h3 class="font-bold">
                                        Looks like something didn't work right
                                    </h3>
                                    <ul>
                                        {#each submissionErrors as error, index (index)}
                                            <li>
                                                <span class="text-xs"
                                                    >● {error}</span
                                                >
                                            </li>
                                        {/each}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    {/if}
                    <form
                        class="space-y-4"
                        onsubmit={(e: SubmitEvent) => {
                            e.preventDefault()
                            e.stopPropagation()
                            authSignInFormHandleSubmit()
                        }}
                    >
                        <AuthSignInFormField
                            name="organizationId"
                            validators={{
                                onBlur: ({ value }) => {
                                    const { error } =
                                        authSignInInputSchema.shape.organizationId.safeParse(
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
                                <div class="relative">
                                    <input
                                        name={field.name}
                                        type="text"
                                        value={field.state.value}
                                        class={errors.length > 0
                                            ? inputClassError
                                            : inputClassDefault}
                                        placeholder="Organization ID"
                                        onblur={field.handleBlur}
                                        oninput={(e) =>
                                            field.handleChange(
                                                e.currentTarget.value,
                                            )}
                                        autocomplete="organization"
                                    />
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
                        </AuthSignInFormField>
                        <AuthSignInFormField
                            name="accountId"
                            validators={{
                                onBlur: ({ value }) => {
                                    const { error } =
                                        authSignInInputSchema.shape.accountId.safeParse(
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
                                <div class="relative">
                                    <input
                                        name={field.name}
                                        type="text"
                                        value={field.state.value}
                                        class={errors.length > 0
                                            ? inputClassError
                                            : inputClassDefault}
                                        placeholder="Account ID"
                                        onblur={field.handleBlur}
                                        oninput={(e) =>
                                            field.handleChange(
                                                e.currentTarget.value,
                                            )}
                                        autocomplete="username"
                                    />
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
                        </AuthSignInFormField>
                        <AuthSignInFormField
                            name="password"
                            validators={{
                                onBlur: ({ value }) => {
                                    const { error } =
                                        authSignInInputSchema.shape.password.safeParse(
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
                                <div class="relative">
                                    <input
                                        name={field.name}
                                        type={showPassword
                                            ? 'text'
                                            : 'password'}
                                        value={field.state.value}
                                        class={errors.length > 0
                                            ? inputClassError
                                            : inputClassDefault}
                                        placeholder="Password"
                                        onblur={field.handleBlur}
                                        oninput={(e) =>
                                            field.handleChange(
                                                e.currentTarget.value,
                                            )}
                                        autocomplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        class="pointer-events-auto absolute top-2.5 right-2.5 focus:outline-none"
                                        onclick={() =>
                                            (showPassword = !showPassword)}
                                        tabindex={-1}
                                    >
                                        {#if showPassword}
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
                        </AuthSignInFormField>
                        <AuthSignInFormSubscribe>
                            <!--
                                README: canSubmit is always true on first form render
                                https://github.com/TanStack/form/issues/723

                                README: Set field errors based on response
                                https://github.com/TanStack/form/discussions/623
                            -->
                            {#snippet children(form)}
                                {@const isDisabled =
                                    !form.canSubmit ||
                                    form.isPristine ||
                                    form.isSubmitting}
                                <button
                                    id="signIn"
                                    type="submit"
                                    class="{isDisabled
                                        ? 'cursor-not-allowed opacity-50'
                                        : ''} w-full rounded-lg bg-orange-400 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-500 focus:ring-2 focus:ring-orange-500 focus:outline-none md:px-5 md:py-2.5"
                                    disabled={isDisabled}
                                >
                                    {form.isSubmitting
                                        ? 'Signing-in...'
                                        : 'Sign-in'}
                                </button>
                            {/snippet}
                        </AuthSignInFormSubscribe>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <Captcha bind:open={showCaptchaModal} />
{/if}
