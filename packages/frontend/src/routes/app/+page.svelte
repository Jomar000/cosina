<script lang="ts">
    import Button from '$lib/components/shadcn/button/button.svelte'
    import * as Card from '$lib/components/shadcn/card/index.js'
    import * as Select from '$lib/components/shadcn/select/index.js'
    import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end'
    import UserStar from '@lucide/svelte/icons/user-star'

    let selectedRole = $state('')
</script>

<div
    class="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10"
>
    <div class="flex w-full max-w-sm flex-col gap-6">
        <a
            href="##"
            class="flex items-center gap-2 self-center font-medium"
        >
            <div
                class="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground"
            >
                <GalleryVerticalEndIcon class="size-4" />
            </div>
            Acme Inc.
        </a>
        <Card.Root class="w-full max-w-sm">
            <Card.Header class="m-auto w-full">
                <div class="flex items-center justify-center">
                    <UserStar size={56} />
                </div>
                <Card.Title class="text-center text-xl"
                    >Role Selection</Card.Title
                >
            </Card.Header>
            <Card.Content>
                <form>
                    <div class="flex flex-col gap-6">
                        <div class="grid gap-2">
                            <Select.Root
                                name="role"
                                bind:value={selectedRole}
                                required
                                type="single"
                            >
                                <Select.Trigger
                                    class="w-full"
                                    id="role"
                                    name="role"
                                >
                                    {selectedRole || 'Select Role'}
                                </Select.Trigger>
                                <Select.Content>
                                    <Select.Item value="User">User</Select.Item>
                                    <Select.Item value="Administrator"
                                        >Administrator</Select.Item
                                    >
                                    <Select.Item value="Super Administrator"
                                        >Super Administrator</Select.Item
                                    >
                                </Select.Content>
                            </Select.Root>
                        </div>
                    </div>
                </form>
            </Card.Content>
            <Card.Footer class="flex-col">
                <Button
                    type="submit"
                    class="w-full">Proceed to Dashboard</Button
                >
            </Card.Footer>
        </Card.Root>
    </div>
</div>
