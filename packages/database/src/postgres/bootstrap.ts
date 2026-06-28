/* istanbul ignore file -- @preserve */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

import {
    cleanupTestDatabases,
    createTestDatabaseName,
    databaseNameFrom,
    dropDatabase,
    recreateDatabase,
} from './utilities.js'

const envPath = fileURLToPath(new URL('../../.env.test', import.meta.url))
const baseConnectionStringKey = 'COSINA_TEST_DATABASE_BASE_URL'
const setupStateKey = 'COSINA_TEST_DATABASE_SETUP'

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
    const baseConnectionString = connectionStringFromEnv()
    const connectionUrl = new URL(baseConnectionString)
    const databaseName = createTestDatabaseName(
        databaseNameFrom(baseConnectionString),
    )

    connectionUrl.pathname = `/${databaseName}`

    const connectionString = connectionUrl.toString()

    process.env[baseConnectionStringKey] = baseConnectionString
    process.env.DATABASE_URL = connectionString
    process.env[
        `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_${hyperdriveBinding}`
    ] = connectionString
}

export default async function manageTestDatabaseLifecycle() {
    const baseConnectionString = process.env[baseConnectionStringKey]
    const connectionString = process.env.DATABASE_URL

    if (!baseConnectionString || !connectionString) {
        throw new Error(
            'Test database environment was not configured by Vitest',
        )
    }

    if (process.env[setupStateKey] === connectionString) {
        return
    }

    try {
        const cleanupResult = await cleanupTestDatabases(baseConnectionString)

        if (cleanupResult.droppedCount > 0) {
            console.log(
                `bootstrap: Dropped ${cleanupResult.droppedCount} stale test database(s).`,
            )
        }

        for (const failure of cleanupResult.failures) {
            console.error(
                `bootstrap: Failed to drop stale test database "${failure.databaseName}".`,
                failure.error,
            )
        }
    } catch (error) {
        console.error(
            'bootstrap: Stale test database discovery failed; continuing with test setup.',
            error,
        )
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
    const cleanupStaleTests = process.argv.includes('--cleanup-stale-tests')

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

    if (cleanupStaleTests) {
        const cleanupResult = await cleanupTestDatabases(connectionString)

        console.log(
            `bootstrap: Dropped ${cleanupResult.droppedCount} test database(s).`,
        )

        if (cleanupResult.failures.length > 0) {
            throw new AggregateError(
                cleanupResult.failures.map(({ error }) => error),
                `Failed to drop ${cleanupResult.failures.length} test database(s)`,
            )
        }
    } else {
        await recreateDatabase(connectionString)

        console.log('bootstrap: OPERATION COMPLETED. 🚀')
    }
}
