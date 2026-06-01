import { describe, expect, it } from 'vitest'

import { getDatabaseConfig } from '../src/core/adapters/nitroRuntime.js'
import { testDatabaseConfig } from './runtime.config.js'

const HYPERDRIVE_BINDING = 'HYPERIONPUB_HD'

type TCloudflareRuntimeRequest = Request & {
    runtime?: {
        cloudflare?: {
            env?: Record<string, unknown>
        }
    }
}

const requestWithHyperdriveBinding = (
    binding: Record<string, unknown>,
): Request => {
    return Object.assign(new Request('https://api.example.test/'), {
        runtime: {
            cloudflare: {
                env: {
                    [HYPERDRIVE_BINDING]: binding,
                },
            },
        },
    } satisfies Pick<TCloudflareRuntimeRequest, 'runtime'>)
}

describe.concurrent('Concurrent Tests', () => {
    it('uses the Hyperdrive connection string when the binding is available', () => {
        const connectionString =
            'postgres://hyperdrive:secret@example.test:5432/hyperion'

        expect(
            getDatabaseConfig(
                requestWithHyperdriveBinding({ connectionString }),
            ),
        ).toBe(connectionString)
    })

    it('falls back to plain runtime config when no request runtime exists', () => {
        expect(getDatabaseConfig()).toEqual(testDatabaseConfig)
    })

    it('falls back to plain runtime config when the binding has no non-empty connection string', () => {
        expect(
            getDatabaseConfig(
                requestWithHyperdriveBinding({ connectionString: '' }),
            ),
        ).toEqual(testDatabaseConfig)
    })
})
