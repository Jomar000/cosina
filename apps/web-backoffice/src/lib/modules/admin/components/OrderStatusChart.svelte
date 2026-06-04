<script lang="ts">
    import { onMount } from 'svelte'

    ////////////////////
    // 01. Properties //
    ////////////////////

    let {
        completedCount,
        cancelledCount,
        loading = false,
        error = false,
    }: {
        completedCount: number
        cancelledCount: number
        loading?: boolean
        error?: boolean
    } = $props()

    ///////////////////
    // 02. Constants //
    ///////////////////

    // Match the stat-card accent colors for visual consistency
    const COLOR_COMPLETED = '#10b981' // emerald-500
    const COLOR_CANCELLED = '#f43f5e' // rose-500

    ///////////////
    // 03. State //
    ///////////////

    let chartEl: HTMLDivElement | undefined = $state()
    let apexReady = $state(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let apexInstance: any = null

    /////////////////
    // 04. Derived //
    /////////////////

    const total = $derived(completedCount + cancelledCount)

    /////////////////
    // 08. Effects //
    /////////////////

    onMount(() => {
        let cleanup: (() => void) | undefined

        import('apexcharts').then(({ default: ApexCharts }) => {
            if (!chartEl) return

            function isDark() {
                return document.documentElement.classList.contains('dark')
            }

            function buildBaseOptions() {
                const dark = isDark()
                return {
                    chart: {
                        type: 'donut' as const,
                        height: 300,
                        background: 'transparent',
                        toolbar: { show: false },
                        animations: {
                            enabled: true,
                            speed: 400,
                            animateGradually: { enabled: true, delay: 80 },
                            dynamicAnimation: { enabled: true, speed: 300 },
                        },
                        fontFamily: 'inherit',
                    },
                    theme: {
                        mode: dark ? ('dark' as const) : ('light' as const),
                    },
                    colors: [
                        COLOR_COMPLETED,
                        COLOR_CANCELLED,
                    ],
                    // Start with an empty series so ApexCharts shows the noData
                    // text until real data arrives via updateSeries()
                    series: [] as number[],
                    labels: [
                        'Completed',
                        'Cancelled',
                    ],
                    plotOptions: {
                        pie: {
                            donut: {
                                size: '72%',
                                labels: {
                                    show: true,
                                    name: {
                                        show: true,
                                        fontSize: '13px',
                                        fontFamily: 'inherit',
                                        offsetY: -4,
                                    },
                                    value: {
                                        show: true,
                                        fontSize: '24px',
                                        fontFamily: 'inherit',
                                        fontWeight: 700,
                                        offsetY: 4,
                                        formatter: (v: string) => v,
                                    },
                                    total: {
                                        show: true,
                                        label: 'Total',
                                        fontSize: '12px',
                                        fontFamily: 'inherit',
                                        formatter: () => String(total),
                                    },
                                },
                            },
                            expandOnClick: false,
                        },
                    },
                    dataLabels: { enabled: false },
                    legend: {
                        show: true,
                        position: 'bottom' as const,
                        fontFamily: 'inherit',
                        fontSize: '12px',
                        markers: { size: 8 },
                        itemMargin: { horizontal: 12, vertical: 4 },
                        formatter: (
                            label: string,
                            opts: {
                                w: { globals: { series: number[] } }
                                seriesIndex: number
                            },
                        ) => {
                            const count =
                                opts.w.globals.series[opts.seriesIndex] ?? 0
                            return `${label} (${count})`
                        },
                    },
                    tooltip: {
                        theme: dark ? 'dark' : 'light',
                        y: {
                            formatter: (v: number) =>
                                `${v} order${v !== 1 ? 's' : ''}`,
                        },
                        style: { fontSize: '12px', fontFamily: 'inherit' },
                    },
                    stroke: { width: 0 },
                    noData: {
                        text: 'Loading…',
                        align: 'center' as const,
                        verticalAlign: 'middle' as const,
                        style: { fontSize: '13px' },
                    },
                    states: {
                        hover: { filter: { type: 'darken', value: 0.88 } },
                        active: { filter: { type: 'none' } },
                    },
                }
            }

            apexInstance = new ApexCharts(chartEl!, buildBaseOptions())
            apexInstance.render().then(() => {
                apexReady = true
            })

            const themeObserver = new MutationObserver(() => {
                const dark = isDark()
                apexInstance?.updateOptions(
                    { theme: { mode: dark ? 'dark' : 'light' } },
                    false,
                    false,
                )
            })
            themeObserver.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ['class'],
            })

            cleanup = () => {
                themeObserver.disconnect()
                apexInstance?.destroy()
                apexInstance = null
                apexReady = false
            }
        })

        return () => cleanup?.()
    })

    // Sync chart whenever counts change
    $effect(() => {
        if (!apexReady || !apexInstance) return

        const completed = completedCount
        const cancelled = cancelledCount
        const tot = total

        if (loading || error || tot === 0) {
            // Empty series triggers the noData text properly on donut charts
            apexInstance.updateOptions(
                {
                    noData: {
                        text: loading
                            ? 'Loading…'
                            : error
                              ? 'Failed to load data.'
                              : 'No orders in this period.',
                    },
                    plotOptions: {
                        pie: {
                            donut: {
                                labels: { total: { formatter: () => '0' } },
                            },
                        },
                    },
                },
                false,
                false,
            )
            apexInstance.updateSeries([])
            return
        }

        // Update the total label formatter first, then push the new series
        apexInstance.updateOptions(
            {
                noData: { text: '' },
                plotOptions: {
                    pie: {
                        donut: {
                            labels: {
                                total: { formatter: () => String(tot) },
                            },
                        },
                    },
                },
            },
            false,
            false,
        )
        apexInstance.updateSeries([
            completed,
            cancelled,
        ])
    })
</script>

<div
    bind:this={chartEl}
    class="min-h-75"
></div>
