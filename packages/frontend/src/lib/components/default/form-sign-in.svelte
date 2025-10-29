<!-- https://shadcn-svelte.com/blocks/login#login-03 -->

<script lang="ts">
    import { authSignInInputSchema } from '@hyperion/validator/internal/auth'
    import { createForm } from '@tanstack/svelte-form'
    import { createMutation } from '@tanstack/svelte-query'
    import { tick } from 'svelte'
    import type { HTMLAttributes } from 'svelte/elements'
    import type { z } from 'zod'

    import { goto } from '$app/navigation'
    import { PUBLIC_CF_TURNSTILE_SITE_KEY } from '$env/static/public'
    import { Button } from '$lib/components/shadcn/button/index.js'
    import * as Card from '$lib/components/shadcn/card/index.js'
    import {
        Field,
        FieldDescription,
        FieldError,
        FieldGroup,
        FieldLabel,
    } from '$lib/components/shadcn/field/index.js'
    import { Input } from '$lib/components/shadcn/input/index.js'
    import { cn } from '$lib/shadcn.js'
    import type { AuthState } from '$lib/states/auth/context.svelte'
    import type { SessionState } from '$lib/states/session/context.svelte'
    import { getCookie } from '$lib/utilities.js'

    ////////////////
    // Properties //
    ////////////////

    let {
        class: className,
        auth,
        session,
        showCaptchaModal = $bindable(false),
        ...restProps
    }: HTMLAttributes<HTMLDivElement> & {
        auth: AuthState
        session: SessionState
        showCaptchaModal: boolean
    } = $props()

    ////////////////////
    // Initialization //
    ////////////////////

    let showPassword = $state(false)
    let submissionErrors: string[] = $state([])

    const id = $props.id()

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
                | ReturnType<typeof auth.client.signIn.email>
                | ReturnType<typeof auth.client.signIn.username>
                | null = null

            // Submit Form Data
            try {
                if (data.accountId.includes('@')) {
                    response = await auth.client.signIn.email(
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
                    response = await auth.client.signIn.username(
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

                if (response.error) {
                    const { error: _error } = response.error
                    throw new Error(_error.message)
                }

                const { data: _data } = response.data
                session.set(_data)

                if (session.data?.userRoles.length === 1) {
                    goto(`/app/${session.data?.userRoles[0]}/dashboard`)
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
                            <Field data-invalid={!isValid}>
                                <FieldLabel for="organization-id-{id}"
                                    >Organization ID</FieldLabel
                                >
                                <Input
                                    aria-invalid={!isValid}
                                    autocomplete="organization"
                                    id="organization-id-{id}"
                                    name={field.name}
                                    onblur={field.handleBlur}
                                    oninput={(e) =>
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
                            <Field data-invalid={!isValid}>
                                <FieldLabel for="account-id-{id}"
                                    >Account ID</FieldLabel
                                >
                                <Input
                                    aria-invalid={!isValid}
                                    autocomplete="username"
                                    id="account-id-{id}"
                                    name={field.name}
                                    onblur={field.handleBlur}
                                    oninput={(e) =>
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
                            <Field data-invalid={!isValid}>
                                <div class="flex items-center">
                                    <FieldLabel for="password-{id}"
                                        >Password</FieldLabel
                                    >
                                    <a
                                        href="##"
                                        class="ml-auto text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <Input
                                    aria-invalid={!isValid}
                                    autocomplete="current-password"
                                    id="password-{id}"
                                    name={field.name}
                                    onblur={field.handleBlur}
                                    oninput={(e) =>
                                        field.handleChange(
                                            e.currentTarget.value,
                                        )}
                                    placeholder="⊛⊛⊛⊛⊛⊛⊛⊛"
                                    required
                                    type={showPassword ? 'text' : 'password'}
                                    value={field.state.value}
                                />
                                <!-- TODO: Add Show/Hide button -->
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
                                    Don't have an account? <a href="##"
                                        >Sign-up</a
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
        By clicking continue, you agree to our <a href="##">Terms of Service</a>
        and <a href="##">Privacy Policy</a>.
    </FieldDescription>
</div>
