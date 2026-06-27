<script lang="ts">
    import * as Card from '@hyperion/ui/components/card'
    import * as Popover from '@hyperion/ui/components/popover'
    import * as RangeCalendar from '@hyperion/ui/components/range-calendar'
    import { Button } from '@hyperion/ui/components/button'
    import { Input } from '@hyperion/ui/components/input'
    import { Label } from '@hyperion/ui/components/label'
    import { Separator } from '@hyperion/ui/components/separator'
    import { Textarea } from '@hyperion/ui/components/textarea'
    import { Skeleton } from '@hyperion/ui/components/skeleton'
    import CalendarIcon from '@lucide/svelte/icons/calendar'
    import CalendarOffIcon from '@lucide/svelte/icons/calendar-off'
    import InfoIcon from '@lucide/svelte/icons/info'
    import PlusIcon from '@lucide/svelte/icons/plus'
    import SettingsIcon from '@lucide/svelte/icons/settings'
    import SmartphoneIcon from '@lucide/svelte/icons/smartphone'
    import Trash2Icon from '@lucide/svelte/icons/trash-2'
    import {
        today,
        getLocalTimeZone,
        parseDate,
        type DateValue,
    } from '@internationalized/date'
    import {
        createQuery,
        createMutation,
        useQueryClient,
    } from '@tanstack/svelte-query'
    import { toast } from 'svelte-sonner'

    import { adminClient } from '$lib/clients'
    import { wsClientManager } from '$lib/utilities/wsClientManager'

    ////////////////////
    // 01. Types      //
    ////////////////////

    type TClosingDayItem = {
        id: string
        startDate: string
        endDate: string
        reason?: string
    }

    type TSettingsData = {
        advanceDays: number
        restaurantAddress: string | null
        closingDays: TClosingDayItem[]
        gcashAccountName: string | null
        gcashNumber: string | null
        paymentInstructions: string | null
    }

    type TDateRange = {
        start: DateValue | undefined
        end: DateValue | undefined
    }

    ///////////////
    // 03. State //
    ///////////////

    const queryClient = useQueryClient()

    // Order Settings form state
    let advanceDaysInput = $state(3)
    let restaurantAddressInput = $state('')

    // Payment Details form state
    let gcashAccountNameInput = $state('')
    let gcashNumberInput = $state('')
    let paymentInstructionsInput = $state('')

    // Closing Days add-form state
    let addFormOpen = $state(false)
    let addPickerOpen = $state(false)
    let newRange = $state<TDateRange | undefined>(undefined)
    let newReason = $state('')

    /////////////////
    // 05. Queries //
    /////////////////

    const settingsQuery = createQuery<TSettingsData>(() => ({
        queryKey: [
            'admin',
            'order',
            'settings',
        ],
        queryFn: async () => {
            const response = await adminClient.settings.read.$get()
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data as TSettingsData
        },
    }))

    /////////////////
    // 04. Derived //
    /////////////////

    const closingDays = $derived<TClosingDayItem[]>(
        settingsQuery.data?.closingDays ?? [],
    )

    const previewMinDateLabel = $derived.by(() => {
        const timestamp = Date.now() + advanceDaysInput * 24 * 60 * 60 * 1000
        return new Intl.DateTimeFormat('en-PH', { dateStyle: 'long' }).format(
            timestamp,
        )
    })

    const newRangeLabel = $derived.by(() => {
        if (!newRange?.start) return 'Pick a date range'
        const fmt = (d: DateValue) =>
            new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(
                d.toDate(getLocalTimeZone()),
            )
        if (!newRange.end) return fmt(newRange.start)
        return `${fmt(newRange.start)} – ${fmt(newRange.end)}`
    })

    ///////////////////
    // 06. Mutations //
    ///////////////////

    const updateSettingsMutation = createMutation(() => ({
        mutationFn: async (payload: {
            advanceDays: number
            restaurantAddress?: string
            gcashAccountName?: string
            gcashNumber?: string
            paymentInstructions?: string
        }) => {
            const response = await adminClient.settings.update.$post({
                json: payload,
            })
            const { data, error, success } = await response.json()
            if (!success) throw new Error(error.message)
            return data as TSettingsData
        },
        onSuccess: (data) => {
            queryClient.setQueryData<TSettingsData>(
                [
                    'admin',
                    'order',
                    'settings',
                ],
                (current) => ({
                    ...(current ?? ({} as TSettingsData)),
                    ...data,
                }),
            )
            toast.success('Order settings saved and broadcast to customers.')
        },
        onError: (err: Error) => toast.error(err.message),
    }))

    const updateClosingDaysMutation = createMutation(() => ({
        mutationFn: async (days: TClosingDayItem[]) => {
            // Cast through unknown because the Hono RPC type is not yet aware of
            // the new /closingDays/update sub-route until the type is regenerated.
            const endpoint = (
                adminClient.settings as unknown as {
                    closingDays: {
                        update: {
                            $post: (opts: {
                                json: { closingDays: TClosingDayItem[] }
                            }) => Promise<Response>
                        }
                    }
                }
            ).closingDays.update

            const response = await endpoint.$post({
                json: { closingDays: days },
            })
            const json = (await response.json()) as {
                success: boolean
                data: { closingDays: TClosingDayItem[] }
                error: { message: string }
            }
            if (!json.success) throw new Error(json.error.message)
            return json.data
        },
        onSuccess: (data) => {
            queryClient.setQueryData<TSettingsData>(
                [
                    'admin',
                    'order',
                    'settings',
                ],
                (current) =>
                    current
                        ? { ...current, closingDays: data.closingDays }
                        : current,
            )
        },
        onError: (err: Error) => toast.error(err.message),
    }))

    /////////////////
    // 08. Effects //
    /////////////////

    // Sync query data into local inputs (one-way, runs once on first load)
    $effect(() => {
        const fetched = settingsQuery.data
        if (fetched !== undefined) {
            advanceDaysInput = fetched.advanceDays
            restaurantAddressInput = fetched.restaurantAddress ?? ''
            gcashAccountNameInput = fetched.gcashAccountName ?? ''
            gcashNumberInput = fetched.gcashNumber ?? ''
            paymentInstructionsInput = fetched.paymentInstructions ?? ''
        }
    })

    // Real-time: listen for settings.update from other sessions/tabs
    $effect(() => {
        const ws = wsClientManager.connect('settings')

        function handleMessage(event: MessageEvent) {
            try {
                const { event: eventType, data } = JSON.parse(event.data) as {
                    event: string
                    data: Partial<TSettingsData>
                }
                if (eventType === 'settings.update') {
                    queryClient.setQueryData<TSettingsData>(
                        [
                            'admin',
                            'order',
                            'settings',
                        ],
                        (current) => ({
                            advanceDays:
                                typeof data.advanceDays === 'number'
                                    ? data.advanceDays
                                    : (current?.advanceDays ?? 3),
                            restaurantAddress:
                                'restaurantAddress' in data
                                    ? (data.restaurantAddress ?? null)
                                    : (current?.restaurantAddress ?? null),
                            closingDays: Array.isArray(data.closingDays)
                                ? (data.closingDays as TClosingDayItem[])
                                : (current?.closingDays ?? []),
                            gcashAccountName:
                                'gcashAccountName' in data
                                    ? (data.gcashAccountName ?? null)
                                    : (current?.gcashAccountName ?? null),
                            gcashNumber:
                                'gcashNumber' in data
                                    ? (data.gcashNumber ?? null)
                                    : (current?.gcashNumber ?? null),
                            paymentInstructions:
                                'paymentInstructions' in data
                                    ? (data.paymentInstructions ?? null)
                                    : (current?.paymentInstructions ?? null),
                        }),
                    )
                }
            } catch {
                // ignore malformed messages
            }
        }

        ws.addEventListener('message', handleMessage)

        return () => {
            ws.removeEventListener('message', handleMessage)
            ws.release()
        }
    })

    //////////////////
    // 09. Handlers //
    //////////////////

    function saveOrderSettings() {
        const clamped = Math.max(1, Math.min(30, Math.floor(advanceDaysInput)))
        advanceDaysInput = clamped
        updateSettingsMutation.mutate({
            advanceDays: clamped,
            restaurantAddress: restaurantAddressInput.trim() || undefined,
            gcashAccountName: gcashAccountNameInput.trim() || undefined,
            gcashNumber: gcashNumberInput.trim() || undefined,
            paymentInstructions: paymentInstructionsInput.trim() || undefined,
        })
    }

    function addClosingRange() {
        if (!newRange?.start || !newRange?.end) {
            toast.error('Please select a complete date range.')
            return
        }
        const newItem: TClosingDayItem = {
            id: crypto.randomUUID(),
            startDate: newRange.start.toString(),
            endDate: newRange.end.toString(),
            reason: newReason.trim() || undefined,
        }
        updateClosingDaysMutation.mutate(
            [
                ...closingDays,
                newItem,
            ],
            {
                onSuccess: () => {
                    toast.success('Closing range added.')
                    resetAddForm()
                },
            },
        )
    }

    function removeClosingRange(id: string) {
        const updated = closingDays.filter((r) => r.id !== id)
        updateClosingDaysMutation.mutate(updated, {
            onSuccess: () => toast.success('Closing range removed.'),
        })
    }

    function resetAddForm() {
        addFormOpen = false
        newRange = undefined
        newReason = ''
        addPickerOpen = false
    }

    /////////////////
    // 10. Helpers //
    /////////////////

    function formatDateRange(startDate: string, endDate: string): string {
        const fmt = (s: string) =>
            new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(
                parseDate(s).toDate(getLocalTimeZone()),
            )
        return startDate === endDate
            ? fmt(startDate)
            : `${fmt(startDate)} – ${fmt(endDate)}`
    }
</script>

<main class="flex flex-1 flex-col gap-6 p-4 pt-2 md:p-6">
    <!-- Page header -->
    <div class="flex items-center gap-3">
        <div
            class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 ring-1 ring-blue-500/20"
        >
            <SettingsIcon class="size-5 text-blue-400" />
        </div>
        <div>
            <h1 class="text-xl font-bold tracking-tight">Settings</h1>
            <p class="text-muted-foreground text-sm">
                Manage order rules and restaurant configuration.
            </p>
        </div>
    </div>

    <!-- ── Card 1: Order Settings ─────────────────────────────────── -->
    <Card.Root>
        <Card.Header>
            <Card.Title>Order Settings</Card.Title>
            <Card.Description>
                Configure how the customer-facing order form behaves.
            </Card.Description>
        </Card.Header>

        <Card.Content class="flex flex-col gap-5">
            {#if settingsQuery.isPending}
                <div class="flex flex-col gap-3">
                    <Skeleton class="h-4 w-40" />
                    <Skeleton class="h-9 w-24" />
                    <Skeleton class="h-16 w-full rounded-lg" />
                </div>
                <div class="flex flex-col gap-3">
                    <Skeleton class="h-4 w-32" />
                    <Skeleton class="h-20 w-full" />
                </div>
            {:else}
                <!-- Advance order days -->
                <div class="flex flex-col gap-3">
                    <div class="flex flex-col gap-1">
                        <Label
                            for="advanceDays"
                            class="text-sm font-medium"
                        >
                            Minimum Advance Order Days
                        </Label>
                        <p class="text-muted-foreground text-xs">
                            Customers must place orders at least this many days
                            before their requested delivery date.
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <Input
                            id="advanceDays"
                            type="number"
                            min="1"
                            max="30"
                            bind:value={advanceDaysInput}
                            class="w-24 text-center tabular-nums"
                        />
                        <span class="text-muted-foreground text-sm">
                            {advanceDaysInput === 1 ? 'day' : 'days'} in advance
                        </span>
                    </div>

                    <!-- Customer preview banner -->
                    <div
                        class="flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3.5 py-3"
                    >
                        <CalendarIcon
                            class="mt-0.5 size-4 shrink-0 text-blue-500"
                        />
                        <div class="flex flex-col gap-0.5">
                            <p
                                class="text-xs font-semibold text-blue-700 dark:text-blue-300"
                            >
                                Customer Preview
                            </p>
                            <p
                                class="text-xs/relaxed text-blue-700/80 dark:text-blue-300/80"
                            >
                                Orders must be placed at least
                                <span
                                    class="font-semibold text-blue-800 dark:text-blue-200"
                                >
                                    {advanceDaysInput}
                                    {advanceDaysInput === 1 ? 'day' : 'days'} in advance</span
                                >. The earliest available delivery date will be
                                <span
                                    class="font-semibold text-blue-800 dark:text-blue-200"
                                >
                                    {previewMinDateLabel}
                                </span>.
                            </p>
                        </div>
                    </div>

                    <!-- WebSocket broadcast note -->
                    <div
                        class="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5"
                    >
                        <InfoIcon
                            class="mt-0.5 size-3.5 shrink-0 text-emerald-500"
                        />
                        <p
                            class="text-xs/relaxed text-emerald-700 dark:text-emerald-400"
                        >
                            Saving will broadcast the new value to all connected
                            customer devices in real time via WebSocket.
                        </p>
                    </div>
                </div>

                <!-- Restaurant address -->
                <div class="flex flex-col gap-3">
                    <div class="flex flex-col gap-1">
                        <Label
                            for="restaurantAddress"
                            class="text-sm font-medium"
                        >
                            Restaurant / Pickup Address
                        </Label>
                        <p class="text-muted-foreground text-xs">
                            Shown to customers who select Self Pickup as their
                            delivery option.
                        </p>
                    </div>

                    <Textarea
                        id="restaurantAddress"
                        placeholder="e.g. 123 Main St, Barangay Sample, Makati City, Metro Manila"
                        bind:value={restaurantAddressInput}
                        rows={3}
                        class="resize-none text-sm"
                    />
                </div>
            {/if}
        </Card.Content>

        <Card.Footer class="justify-end border-t pt-4">
            <Button
                onclick={saveOrderSettings}
                disabled={updateSettingsMutation.isPending ||
                    settingsQuery.isPending}
            >
                {updateSettingsMutation.isPending
                    ? 'Saving…'
                    : 'Save & Broadcast'}
            </Button>
        </Card.Footer>
    </Card.Root>

    <!-- ── Card 2: Payment Details ───────────────────────────────── -->
    <Card.Root>
        <Card.Header>
            <Card.Title>Payment Details</Card.Title>
            <Card.Description>
                GCash account info shown to customers when they pay their
                remaining balance. Changes are broadcast to customers.
            </Card.Description>
        </Card.Header>

        <Card.Content class="flex flex-col gap-5">
            {#if settingsQuery.isPending}
                <div class="flex flex-col gap-3">
                    <Skeleton class="h-4 w-40" />
                    <Skeleton class="h-9 w-full" />
                </div>
                <div class="flex flex-col gap-3">
                    <Skeleton class="h-4 w-32" />
                    <Skeleton class="h-9 w-full" />
                </div>
            {:else}
                <!-- GCash account -->
                <div class="flex flex-col gap-4">
                    <div
                        class="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"
                    >
                        <SmartphoneIcon class="size-4 shrink-0" />
                        GCash
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
                        <div class="flex flex-col gap-2">
                            <Label
                                for="gcashAccountName"
                                class="text-sm font-medium"
                            >
                                Account Name
                            </Label>
                            <Input
                                id="gcashAccountName"
                                placeholder="e.g. Cosina Home Cooking"
                                maxlength={128}
                                bind:value={gcashAccountNameInput}
                                class="text-sm"
                            />
                        </div>

                        <div class="flex flex-col gap-2">
                            <Label
                                for="gcashNumber"
                                class="text-sm font-medium"
                            >
                                GCash Number
                            </Label>
                            <Input
                                id="gcashNumber"
                                placeholder="e.g. 0917-450-5619"
                                maxlength={32}
                                bind:value={gcashNumberInput}
                                class="text-sm"
                            />
                        </div>
                    </div>
                </div>

                <Separator />

                <!-- Additional instructions -->
                <div class="flex flex-col gap-2">
                    <Label
                        for="paymentInstructions"
                        class="text-sm font-medium"
                    >
                        Payment Instructions
                        <span class="text-muted-foreground font-normal"
                            >(optional)</span
                        >
                    </Label>
                    <p class="text-muted-foreground text-xs">
                        Extra notes shown to customers when paying the remaining
                        balance (e.g. "Include your order code in the GCash
                        message").
                    </p>
                    <Textarea
                        id="paymentInstructions"
                        placeholder="e.g. Include your tracking code in the GCash note/message."
                        bind:value={paymentInstructionsInput}
                        rows={3}
                        maxlength={512}
                        class="resize-none text-sm"
                    />
                </div>
            {/if}
        </Card.Content>

        <Card.Footer class="justify-end border-t pt-4">
            <Button
                onclick={saveOrderSettings}
                disabled={updateSettingsMutation.isPending ||
                    settingsQuery.isPending}
            >
                {updateSettingsMutation.isPending
                    ? 'Saving…'
                    : 'Save & Broadcast'}
            </Button>
        </Card.Footer>
    </Card.Root>

    <!-- ── Card 3: Closing Days ────────────────────────────────────── -->
    <Card.Root>
        <Card.Header>
            <Card.Title>Closing Days</Card.Title>
            <Card.Description>
                Date ranges when the restaurant is closed. These dates will be
                disabled in the customer delivery date picker.
            </Card.Description>
            <Card.Action>
                <Button
                    variant="outline"
                    size="sm"
                    onclick={() => {
                        if (addFormOpen) {
                            resetAddForm()
                        } else {
                            addFormOpen = true
                        }
                    }}
                    disabled={settingsQuery.isPending}
                >
                    <PlusIcon class="size-3.5" />
                    Add Range
                </Button>
            </Card.Action>
        </Card.Header>

        <Card.Content class="flex flex-col gap-4">
            <!-- Inline add form -->
            {#if addFormOpen}
                <div
                    class="flex flex-col gap-4 rounded-lg border border-dashed p-4"
                >
                    <p class="text-sm font-semibold">New Closing Range</p>

                    <!-- Date range picker -->
                    <div class="flex flex-col gap-1.5">
                        <Label class="text-xs font-medium">Date Range</Label>
                        <Popover.Root bind:open={addPickerOpen}>
                            <Popover.Trigger>
                                {#snippet child({ props })}
                                    <Button
                                        variant="outline"
                                        {...props}
                                        class="h-9 w-full justify-start gap-2 font-normal sm:w-auto"
                                    >
                                        <CalendarIcon class="size-4 shrink-0" />
                                        <span class="text-sm"
                                            >{newRangeLabel}</span
                                        >
                                    </Button>
                                {/snippet}
                            </Popover.Trigger>
                            <Popover.Content
                                class="w-auto p-0"
                                align="start"
                            >
                                <RangeCalendar.RangeCalendar
                                    bind:value={newRange}
                                    minValue={today(getLocalTimeZone())}
                                />
                            </Popover.Content>
                        </Popover.Root>
                    </div>

                    <!-- Optional reason -->
                    <div class="flex flex-col gap-1.5">
                        <Label
                            for="newReason"
                            class="text-xs font-medium"
                        >
                            Reason
                            <span class="text-muted-foreground font-normal"
                                >(optional)</span
                            >
                        </Label>
                        <Input
                            id="newReason"
                            placeholder="e.g. Public holiday, Family event"
                            bind:value={newReason}
                            maxlength={128}
                            class="h-9 text-sm"
                        />
                    </div>

                    <!-- Actions -->
                    <div class="flex gap-2">
                        <Button
                            size="sm"
                            onclick={addClosingRange}
                            disabled={!newRange?.start ||
                                !newRange?.end ||
                                updateClosingDaysMutation.isPending}
                        >
                            {updateClosingDaysMutation.isPending
                                ? 'Saving…'
                                : 'Add Range'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onclick={resetAddForm}
                            disabled={updateClosingDaysMutation.isPending}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            {/if}

            <!-- Existing ranges list -->
            {#if settingsQuery.isPending}
                <div class="flex flex-col gap-2">
                    {#each [1, 2] as i (i)}
                        <Skeleton class="h-12 w-full rounded-lg" />
                    {/each}
                </div>
            {:else if closingDays.length === 0 && !addFormOpen}
                <div
                    class="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center"
                >
                    <CalendarOffIcon class="text-muted-foreground size-8" />
                    <div class="flex flex-col gap-0.5">
                        <p class="text-sm font-medium">No closing ranges set</p>
                        <p class="text-muted-foreground text-xs">
                            Customers can book deliveries on any available date.
                        </p>
                    </div>
                </div>
            {:else if closingDays.length > 0}
                <div class="flex flex-col gap-2">
                    {#each closingDays as range (range.id)}
                        <div
                            class="flex items-center justify-between rounded-lg border px-3.5 py-2.5"
                        >
                            <div class="flex flex-col gap-0.5">
                                <p class="text-sm font-medium">
                                    {formatDateRange(
                                        range.startDate,
                                        range.endDate,
                                    )}
                                </p>
                                {#if range.reason}
                                    <p class="text-muted-foreground text-xs">
                                        {range.reason}
                                    </p>
                                {/if}
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                class="text-destructive hover:text-destructive size-7 shrink-0"
                                onclick={() => removeClosingRange(range.id)}
                                disabled={updateClosingDaysMutation.isPending}
                                aria-label="Remove closing range"
                            >
                                <Trash2Icon class="size-3.5" />
                            </Button>
                        </div>
                    {/each}
                </div>
            {/if}
        </Card.Content>
    </Card.Root>
</main>
