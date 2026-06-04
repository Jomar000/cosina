<!-- https://shadcn-svelte.com/blocks/login#login-03 -->

<script lang="ts">
    import { Button } from '@hyperion/ui/components/button'
    import * as Card from '@hyperion/ui/components/card'
    import {
        Field,
        FieldError,
        FieldGroup,
        FieldLabel,
    } from '@hyperion/ui/components/field'
    import { Input } from '@hyperion/ui/components/input'
    import { cn } from '@hyperion/ui/utils'
    import { auth as authValidator } from '@hyperion/validator/backoffice'
    import Eye from '@lucide/svelte/icons/eye'
    import EyeOff from '@lucide/svelte/icons/eye-off'
    import Lock from '@lucide/svelte/icons/lock'
    import User from '@lucide/svelte/icons/user'
    import { createForm } from '@tanstack/svelte-form'
    import { createMutation } from '@tanstack/svelte-query'
    import { tick } from 'svelte'
    import { toast } from 'svelte-sonner'
    import type { HTMLAttributes } from 'svelte/elements'
    import type { z } from 'zod'

    import { goto } from '$app/navigation'
    import { PUBLIC_CF_TURNSTILE_SITE_KEY } from '$env/static/public'
    import { authClient } from '$lib/clients'
    import type { SessionState } from '$lib/states/session'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        class: className,
        session,
        showCaptchaModal = $bindable(false), // eslint-disable-line no-useless-assignment
        showLoader = $bindable(false), // eslint-disable-line no-useless-assignment
        ...restProps
    }: HTMLAttributes<HTMLDivElement> & {
        session: SessionState
        showCaptchaModal: boolean
        showLoader: boolean
    } = $props()

    ///////////////
    // 03. State //
    ///////////////

    let errorCopyLabel = $state('COPY')
    let showPassword = $state(false)

    ///////////////////
    // 06. Mutations //
    ///////////////////

    const authSignInMutation = createMutation(() => ({
        mutationKey: [
            'authSignIn',
        ],
        mutationFn: async (
            payload: z.input<typeof authValidator.signInInputSchema>,
        ) => {
            showCaptchaModal = true

            // Wait for DOM update
            await tick()

            const action = payload.accountId.includes('@')
                ? 'sign-in-email'
                : 'sign-in-username'

            // Retrieve CAPTCHA Token
            const captchaToken = await new Promise<string>((resolve) => {
                turnstile.execute('#captchaRenderArea', {
                    sitekey: PUBLIC_CF_TURNSTILE_SITE_KEY,
                    action,
                    callback: (token: string) => {
                        showCaptchaModal = false
                        turnstile.remove('#captchaRenderArea')
                        resolve(token)
                    },
                })
            })

            // Submit Form Data
            try {
                const endpoint =
                    action === 'sign-in-email'
                        ? authClient['sign-in'].email
                        : authClient['sign-in'].username

                const response = await endpoint.$post(
                    {
                        json: {
                            accountId: payload.accountId,
                            password: payload.password,
                        },
                    },
                    {
                        headers: {
                            'x-captcha-response': captchaToken,
                        },
                    },
                )

                const { data, error, success } = await response.json()

                if (!success) {
                    throw new Error(error.message)
                }

                session.set(data)

                if (!session.isValid()) {
                    throw new Error('Invalid session data.')
                }

                return session.data.userRoles.length === 1
                    ? `/app/${session.data.userRoles[0]}/dashboard`
                    : '/app'
            } catch (err) {
                const message = (err as Error).message

                toast.error('Something went wrong', {
                    class: 'min-w-[360px]',
                    description: message,
                    action: {
                        label: errorCopyLabel,
                        onClick: async (e) => {
                            e.preventDefault()

                            await navigator.clipboard.writeText(message)

                            errorCopyLabel = 'COPIED'

                            setTimeout(() => {
                                errorCopyLabel = 'COPY'
                            }, 2000)
                        },
                    },
                })
            }
        },
    }))

    ///////////////
    // 07. Forms //
    ///////////////

    const {
        Field: AuthSignInFormField,
        Subscribe: AuthSignInFormSubscribe,
        handleSubmit: authSignInFormHandleSubmit,
    } = createForm(() => ({
        onSubmit: async ({ value }) => {
            toast.dismiss()
            const redirect = await authSignInMutation.mutateAsync(value)
            if (redirect) {
                showLoader = true
                await new Promise<void>((resolve) => setTimeout(resolve, 2500))
                goto(redirect)
            }
        },
        validators: {
            // Make sure form is valid everytime it changes.
            // Error message does not matter, just return a truthy value.
            onChange: ({ value }) => {
                const { error } =
                    authValidator.signInInputSchema.safeParse(value)
                return error
            },
        },
        defaultValues: {
            accountId: '',
            password: '',
        },
    }))
</script>

<div
    class={cn('flex flex-col gap-5', className)}
    {...restProps}
>
    <Card.Root
        class="border border-white/10 bg-white/5 shadow-[0_8px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
        <Card.Header class="pb-2 text-center">
            <Card.Title class="text-2xl font-bold text-white">
                Welcome back
            </Card.Title>
            <Card.Description class="text-blue-200/60">
                Sign in to your account to continue
            </Card.Description>
        </Card.Header>

        <Card.Content class="pt-2">
            <form
                onsubmit={(e: SubmitEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    authSignInFormHandleSubmit()
                }}
            >
                <FieldGroup>
                    <!-- Account ID -->
                    <AuthSignInFormField
                        name="accountId"
                        validators={{
                            onBlur: ({ value }) => {
                                const { error } =
                                    authValidator.signInInputSchema.shape.accountId.safeParse(
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
                            <Field data-invalid={!isValid}>
                                <FieldLabel for="accountId"
                                    >Account ID</FieldLabel
                                >
                                <div class="relative">
                                    <User
                                        class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-300/50"
                                    />
                                    <Input
                                        aria-invalid={!isValid}
                                        autocomplete="username"
                                        autofocus
                                        class="pl-10"
                                        id="accountId"
                                        name={field.name}
                                        onblur={field.handleBlur}
                                        oninput={(
                                            e: Event & {
                                                currentTarget: HTMLInputElement
                                            },
                                        ) =>
                                            field.handleChange(
                                                e.currentTarget.value,
                                            )}
                                        placeholder="email or username"
                                        required
                                        type="text"
                                        value={field.state.value}
                                    />
                                </div>
                                {#if !isValid}
                                    <FieldError>{errors.join('\n')}</FieldError>
                                {/if}
                            </Field>
                        {/snippet}
                    </AuthSignInFormField>

                    <!-- Password -->
                    <AuthSignInFormField
                        name="password"
                        validators={{
                            onBlur: ({ value }) => {
                                const { error } =
                                    authValidator.signInInputSchema.shape.password.safeParse(
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
                            <Field data-invalid={!isValid}>
                                <div class="flex items-center">
                                    <FieldLabel for="password"
                                        >Password</FieldLabel
                                    >
                                    <a
                                        href="##"
                                        class="ml-auto text-xs font-medium text-indigo-400/80 underline-offset-4 hover:text-indigo-300 hover:underline"
                                        tabindex={-1}
                                    >
                                        Forgot password?
                                    </a>
                                </div>
                                <div class="relative">
                                    <Lock
                                        class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-blue-300/50"
                                    />
                                    <Input
                                        aria-invalid={!isValid}
                                        autocomplete="current-password"
                                        class="px-10"
                                        id="password"
                                        name={field.name}
                                        onblur={field.handleBlur}
                                        oninput={(
                                            e: Event & {
                                                currentTarget: HTMLInputElement
                                            },
                                        ) =>
                                            field.handleChange(
                                                e.currentTarget.value,
                                            )}
                                        placeholder="••••••••"
                                        required
                                        type={showPassword
                                            ? 'text'
                                            : 'password'}
                                        value={field.state.value}
                                    />
                                    <Button
                                        type="button"
                                        class="pointer-events-auto absolute top-0 right-0 z-20 cursor-pointer bg-transparent hover:bg-transparent focus:outline-none dark:hover:bg-transparent"
                                        onclick={() =>
                                            (showPassword = !showPassword)}
                                        tabindex={-1}
                                    >
                                        {#if showPassword}
                                            <Eye class="text-foreground" />
                                        {:else}
                                            <EyeOff class="text-foreground" />
                                        {/if}
                                    </Button>
                                </div>
                                {#if !isValid}
                                    <FieldError>{errors.join('\n')}</FieldError>
                                {/if}
                            </Field>
                        {/snippet}
                    </AuthSignInFormField>

                    <!-- Submit -->
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
                            <Field class="gap-3">
                                <Button
                                    class={cn(
                                        'bg-linear-to-r from-indigo-600 to-blue-600 font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.35)] hover:from-indigo-500 hover:to-blue-500',
                                        isDisabled &&
                                            'cursor-not-allowed opacity-50',
                                    )}
                                    disabled={isDisabled}
                                    id="signIn"
                                    type="submit"
                                >
                                    {form.isSubmitting
                                        ? 'Signing in…'
                                        : 'Sign in'}
                                </Button>
                            </Field>
                        {/snippet}
                    </AuthSignInFormSubscribe>
                </FieldGroup>
            </form>
        </Card.Content>
    </Card.Root>
</div>
