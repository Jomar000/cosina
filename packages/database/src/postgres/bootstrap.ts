/* istanbul ignore file -- @preserve */

import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

import { dropDatabase, recreateDatabase } from './utilities.js'

const envPath = fileURLToPath(new URL('../../.env.test', import.meta.url))
const setupStateKey = 'HYPERION_TEST_DATABASE_SETUP'

const connectionStringFromEnv = () => {
    const connectionString = parseEnv(
        readFileSync(envPath, 'utf8'),
    ).DATABASE_URL

    if (!connectionString) {
        throw new Error(`DATABASE_URL is missing from ${envPath}`)
    }

    return connectionString
}

export const prepareTestDatabaseEnvironment = (hyperdriveBinding: string) => {
    const connectionUrl = new URL(connectionStringFromEnv())
    const baseName = decodeURIComponent(
        connectionUrl.pathname.replace(/^\/+/, ''),
    )
    const databaseName = `${baseName}_${randomUUID().replaceAll('-', '')}`

    if (databaseName.length > 63) {
        throw new Error(
            `Generated test database name exceeds PostgreSQL's 63-character limit: ${databaseName}`,
        )
    }

    connectionUrl.pathname = `/${databaseName}`

    const connectionString = connectionUrl.toString()

    process.env.DATABASE_URL = connectionString
    process.env[
        `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_${hyperdriveBinding}`
    ] = connectionString
}

export default async function manageTestDatabaseLifecycle() {
    const connectionString = process.env.DATABASE_URL

    if (!connectionString) {
        throw new Error('Test DATABASE_URL was not configured by Vitest')
    }

    if (process.env[setupStateKey] === connectionString) {
        return
    }

    try {
        await recreateDatabase(connectionString)
    } catch (error) {
        try {
            await dropDatabase(connectionString)
        } catch (cleanupError) {
            console.error(
                'bootstrap: Cleanup after test database setup failure also failed.',
                cleanupError,
            )
        }

        throw error
    }

    process.env[setupStateKey] = connectionString

    const cleanup = async () => {
        if (process.env[setupStateKey] === connectionString) {
            await dropDatabase(connectionString)
            delete process.env[setupStateKey]
        }
    }

    return cleanup
}

if (import.meta.main) {
    const connectionString = process.env.DATABASE_URL ?? ''
    const environment = process.env.NODE_ENV ?? ''

    // This bootstrapper is purely for DEV & TEST environments
    // Use the drizzle-kit CLI for processing STAGING & PRODUCTION environments
    const isBootstrapped = [
        'development',
        'test',
    ].includes(environment)

    if (!isBootstrapped) {
        throw new Error(
            'Invalid environment provided. Valid values are [development|test]',
        )
    }

    await recreateDatabase(connectionString)

    console.log('bootstrap: OPERATION COMPLETED. 🚀')
}
