<!-- https://shadcn-svelte.com/blocks/login#login-03 -->

<script lang="ts">
    import type { HTMLAttributes } from 'svelte/elements'

    import { Button } from '$lib/components/shadcn/button/index.js'
    import * as Card from '$lib/components/shadcn/card/index.js'
    import {
        Field,
        FieldDescription,
        FieldGroup,
        FieldLabel,
    } from '$lib/components/shadcn/field/index.js'
    import { Input } from '$lib/components/shadcn/input/index.js'
    import { cn } from '$lib/shadcn.js'

    let { class: className, ...restProps }: HTMLAttributes<HTMLDivElement> =
        $props()

    const id = $props.id()
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
            <form>
                <FieldGroup>
                    <Field>
                        <FieldLabel for="organization-{id}"
                            >Organization ID</FieldLabel
                        >
                        <Input
                            id="organization-{id}"
                            type="text"
                            placeholder="acme-inc"
                            required
                        />
                    </Field>
                    <Field>
                        <FieldLabel for="account-{id}">Account ID</FieldLabel>
                        <Input
                            id="account-{id}"
                            type="text"
                            placeholder="john.doe@acme.inc"
                            required
                        />
                    </Field>
                    <Field>
                        <div class="flex items-center">
                            <FieldLabel for="password-{id}">Password</FieldLabel
                            >
                            <a
                                href="##"
                                class="ml-auto text-sm underline-offset-4 hover:underline"
                            >
                                Forgot your password?
                            </a>
                        </div>
                        <Input
                            id="password-{id}"
                            type="password"
                            placeholder="⊛⊛⊛⊛⊛⊛⊛⊛"
                            required
                        />
                    </Field>
                    <Field>
                        <Button type="submit">Sign-in</Button>
                        <FieldDescription class="text-center">
                            Don't have an account? <a href="##">Sign-up</a>
                        </FieldDescription>
                    </Field>
                </FieldGroup>
            </form>
        </Card.Content>
    </Card.Root>
    <FieldDescription class="px-6 text-center">
        By clicking continue, you agree to our <a href="##">Terms of Service</a>
        and <a href="##">Privacy Policy</a>.
    </FieldDescription>
</div>
