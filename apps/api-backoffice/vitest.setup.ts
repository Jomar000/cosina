import { vi } from 'vitest'

vi.mock('nitro/runtime-config', async () => {
    const { testRuntimeConfig } = await import('./test/runtime.config.js')

    return {
        useRuntimeConfig: () => testRuntimeConfig,
    }
})

process.on('uncaughtException', () => {})
process.on('unhandledRejection', () => {})
