<!-- https://shadcn-svelte.com/blocks/login#login-03 -->

<script lang="ts">
    import { auth as authValidator } from '@hyperion/validator/public'
    import { Button } from '@hyperion/ui/components/button'
    import * as Card from '@hyperion/ui/components/card'
    import {
        Field,
        FieldDescription,
        FieldError,
        FieldGroup,
        FieldLabel,
    } from '@hyperion/ui/components/field'
    import { Input } from '@hyperion/ui/components/input'
    import { cn } from '@hyperion/ui/utils'
    import Eye from '@lucide/svelte/icons/eye'
    import EyeOff from '@lucide/svelte/icons/eye-off'
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
    import { getCookie } from '$lib/utilities/helpers'

    ////////////////
    // Properties //
    ////////////////

    let {
        class: className,
        session,
        showCaptchaModal = $bindable(false), // eslint-disable-line no-useless-assignment
        ...restProps
    }: HTMLAttributes<HTMLDivElement> & {
        session: SessionState
        showCaptchaModal: boolean
    } = $props()

    ////////////////////
    // Initialization //
    ////////////////////

    let errorCopyLabel = $state('COPY')
    let showPassword = $state(false)

    // Query
    const authSignInQuery = createMutation(() => ({
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
                            organizationId: payload.organizationId,
                            accountId: payload.accountId,
                            password: payload.password,
                        },
                    },
                    {
                        headers: {
                            'x-captcha-response': captchaToken,
                            'x-csrf-token': getCookie('csrf_token') ?? '',
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

    // Form
    const {
        Field: AuthSignInFormField,
        Subscribe: AuthSignInFormSubscribe,
        handleSubmit: authSignInFormHandleSubmit,
    } = createForm(() => ({
        onSubmit: async ({ value }) => {
            toast.dismiss()
            const redirect = await authSignInQuery.mutateAsync(value)
            if (redirect) {
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
            organizationId: '',
            accountId: '',
            password: '',
        },
    }))
</script>

<div
    class={cn('flex flex-col gap-6', className)}
    {...restProps}
>
    <Card.Root>
        <Card.Header class="text-center">
            <Card.Title class="text-xl">Welcome back</Card.Title>
            <Card.Description>Sign-in with your credentials</Card.Description>
        </Card.Header>
        <Card.Content>
            <form
                onsubmit={(e: SubmitEvent) => {
                    e.preventDefault()
                    e.stopPropagation()
                    authSignInFormHandleSubmit()
                }}
            >
                <FieldGroup>
                    <AuthSignInFormField
                        name="organizationId"
                        validators={{
                            onBlur: ({ value }) => {
                                const { error } =
                                    authValidator.signInInputSchema.shape.organizationId.safeParse(
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
                                <FieldLabel for="organizationId"
                                    >Organization ID</FieldLabel
                                >
                                <Input
                                    aria-invalid={!isValid}
                                    autocomplete="organization"
                                    autofocus
                                    id="organizationId"
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
                                    placeholder="acme-inc"
                                    required
                                    type="text"
                                    value={field.state.value}
                                />
                                {#if !isValid}
                                    <FieldError>{errors.join('\n')}</FieldError>
                                {/if}
                            </Field>
                        {/snippet}
                    </AuthSignInFormField>
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
                                <Input
                                    aria-invalid={!isValid}
                                    autocomplete="username"
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
                                    placeholder="john.doe@acme.inc"
                                    required
                                    type="text"
                                    value={field.state.value}
                                />
                                {#if !isValid}
                                    <FieldError>{errors.join('\n')}</FieldError>
                                {/if}
                            </Field>
                        {/snippet}
                    </AuthSignInFormField>
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
                                        class="ml-auto text-sm underline-offset-4 hover:underline"
                                        tabindex={-1}
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <div class="relative">
                                    <Input
                                        aria-invalid={!isValid}
                                        autocomplete="current-password"
                                        class="pr-10"
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
                                        placeholder="⊛⊛⊛⊛⊛⊛⊛⊛"
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
                                            <Eye
                                                class="font-extrabold text-black"
                                            />
                                        {:else}
                                            <EyeOff
                                                class="font-extrabold text-black"
                                            />
                                        {/if}
                                    </Button>
                                </div>
                                {#if !isValid}
                                    <FieldError>{errors.join('\n')}</FieldError>
                                {/if}
                            </Field>
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
                            <Field>
                                <Button
                                    class={isDisabled
                                        ? 'cursor-not-allowed opacity-50'
                                        : ''}
                                    disabled={isDisabled}
                                    id="signIn"
                                    type="submit"
                                    >{form.isSubmitting
                                        ? 'Signing-in...'
                                        : 'Sign-in'}</Button
                                >
                                <FieldDescription class="text-center">
                                    Don't have an account? <a
                                        href="##"
                                        tabindex={-1}>Sign-up</a
                                    >
                                </FieldDescription>
                            </Field>
                        {/snippet}
                    </AuthSignInFormSubscribe>
                </FieldGroup>
            </form>
        </Card.Content>
    </Card.Root>
    <FieldDescription class="px-6 text-center">
        By clicking continue, you agree to our <a
            href="##"
            tabindex={-1}>Terms of Service</a
        >
        and
        <a
            href="##"
            tabindex={-1}>Privacy Policy</a
        >.
    </FieldDescription>
</div>
