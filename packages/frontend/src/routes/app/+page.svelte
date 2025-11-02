<script lang="ts">
    import GalleryVerticalEndIcon from '@lucide/svelte/icons/gallery-vertical-end'
    import UserStar from '@lucide/svelte/icons/user-star'
    import { onMount } from 'svelte'

    import { goto } from '$app/navigation'
    import Button from '$lib/components/shadcn/button/button.svelte'
    import * as Card from '$lib/components/shadcn/card/index.js'
    import * as Select from '$lib/components/shadcn/select/index.js'
    import { useSessionContext } from '$lib/states/session/index.js'

    //////////////
    // Contexts //
    //////////////

    const session = useSessionContext()

    ////////////////////
    // Initialization //
    ////////////////////

    let render = $state(false)
    let selectedRole = $state('')

    ///////////////
    // Lifecycle //
    ///////////////

    onMount(() => {
        if (session.data!.userRoles.length > 1) {
            render = true
        } else {
            goto(`/app/${session.data!.userRoles[0]}/dashboard`)
        }
    })
</script>

{#if render}
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
                                    bind:value={selectedRole}
                                    name="role"
                                    required
                                    type="single"
                                >
                                    <Select.Trigger
                                        class="w-full"
                                        id="role"
                                        name="role"
                                    >
                                        {selectedRole.toUpperCase() ||
                                            '--- SELECT ---'}
                                    </Select.Trigger>
                                    <Select.Content>
                                        {#each session.data!.userRoles as role (role)}
                                            <Select.Item value={role}
                                                >{role.toUpperCase()}</Select.Item
                                            >
                                        {/each}
                                    </Select.Content>
                                </Select.Root>
                            </div>
                        </div>
                    </form>
                </Card.Content>
                <Card.Footer class="flex-col">
                    <Button
                        class="w-full"
                        disabled={selectedRole === ''}
                        onclick={() => goto(`/app/${selectedRole}/dashboard`)}
                        type="submit">Proceed to Dashboard</Button
                    >
                </Card.Footer>
            </Card.Root>
        </div>
    </div>
{/if}
