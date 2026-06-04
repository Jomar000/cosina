<script lang="ts">
    import { onMount } from 'svelte'

    ////////////////////
    // 01. Properties //
    ////////////////////

    type TChartPoint = { label: string; value: number }
    type TPeriod = 'day' | 'week' | 'month'

    let {
        chartData,
        period,
        loading = false,
        error = false,
    }: {
        chartData: TChartPoint[]
        period: TPeriod
        loading?: boolean
        error?: boolean
    } = $props()

    ///////////////
    // 03. State //
    ///////////////

    let chartEl: HTMLDivElement | undefined = $state()
    let apexReady = $state(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let apexInstance: any = null

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

            function getChartColor() {
                return '#3b82f6'
            }

            function buildBaseOptions() {
                const dark = isDark()
                return {
                    chart: {
                        type: 'bar' as const,
                        height: 260,
                        background: 'transparent',
                        toolbar: { show: false },
                        zoom: { enabled: false },
                        animations: {
                            enabled: true,
                            speed: 350,
                            animateGradually: { enabled: false },
                            dynamicAnimation: { enabled: true, speed: 300 },
                        },
                        fontFamily: 'inherit',
                        redrawOnWindowResize: true,
                        redrawOnParentResize: true,
                    },
                    theme: {
                        mode: dark ? ('dark' as const) : ('light' as const),
                    },
                    colors: [getChartColor()],
                    fill: {
                        type: 'gradient',
                        gradient: {
                            shade: dark ? 'dark' : 'light',
                            type: 'vertical',
                            opacityFrom: 1,
                            opacityTo: 0.7,
                            stops: [
                                0,
                                100,
                            ],
                        },
                    },
                    dataLabels: { enabled: false },
                    plotOptions: {
                        bar: {
                            borderRadius: 5,
                            borderRadiusApplication: 'end' as const,
                            columnWidth: '60%',
                        },
                    },
                    xaxis: {
                        categories: [],
                        axisBorder: { show: false },
                        axisTicks: { show: false },
                        labels: { style: { fontSize: '11px' } },
                    },
                    yaxis: {
                        labels: {
                            formatter: (v: number) => formatAmountShort(v),
                            style: { fontSize: '11px' },
                        },
                    },
                    grid: {
                        borderColor: dark
                            ? 'oklch(1 0 0 / 8%)'
                            : 'oklch(0.92 0.004 286.32)',
                        strokeDashArray: 4,
                        xaxis: { lines: { show: false } },
                        yaxis: { lines: { show: true } },
                        padding: { top: 0, right: 4, bottom: 0, left: 4 },
                    },
                    tooltip: {
                        theme: dark ? 'dark' : 'light',
                        y: { formatter: (v: number) => formatAmount(v) },
                        style: { fontSize: '12px', fontFamily: 'inherit' },
                    },
                    noData: {
                        text: 'Loading…',
                        align: 'center' as const,
                        verticalAlign: 'middle' as const,
                        style: { fontSize: '13px' },
                    },
                    series: [{ name: 'Revenue', data: [] as number[] }],
                    states: {
                        hover: { filter: { type: 'darken', value: 0.88 } },
                        active: { filter: { type: 'darken', value: 0.75 } },
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
                    {
                        theme: { mode: dark ? 'dark' : 'light' },
                        grid: {
                            borderColor: dark
                                ? 'oklch(1 0 0 / 8%)'
                                : 'oklch(0.92 0.004 286.32)',
                        },
                        fill: { gradient: { shade: dark ? 'dark' : 'light' } },
                        colors: [getChartColor()],
                    },
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

    // Sync chart whenever props change
    $effect(() => {
        if (!apexReady || !apexInstance) return

        const data = chartData
        const p = period

        const noDataText = loading
            ? 'Loading…'
            : error
              ? 'Failed to load data.'
              : data.every((d) => d.value === 0)
                ? 'No completed orders in this period.'
                : ''

        apexInstance.updateOptions(
            {
                noData: { text: noDataText },
                plotOptions: {
                    bar: {
                        columnWidth:
                            p === 'week' ? '45%' : p === 'day' ? '70%' : '80%',
                    },
                },
                xaxis: { categories: data.map((d) => d.label) },
                series: [{ name: 'Revenue', data: data.map((d) => d.value) }],
            },
            false,
            false,
        )
    })

    /////////////////
    // 10. Helpers //
    /////////////////

    function formatAmount(amount: number) {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP',
        }).format(amount)
    }

    function formatAmountShort(amount: number) {
        if (amount >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`
        if (amount >= 1_000) return `₱${(amount / 1_000).toFixed(1)}K`
        return `₱${amount.toFixed(0)}`
    }
</script>

<div
    bind:this={chartEl}
    class="-mx-3"
></div>
