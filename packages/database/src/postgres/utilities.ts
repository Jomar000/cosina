/* istanbul ignore file -- @preserve */

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'node:url'
import postgresJs from 'postgres'
import { v7 as uuidV7 } from 'uuid'

const testDatabaseMaxAgeMs = 24 * 60 * 60 * 1000

const defaultMigrationsFolder = fileURLToPath(
    new URL('./migrations/default', import.meta.url),
)

const testMigrationsFolder = fileURLToPath(
    new URL('./migrations/test', import.meta.url),
)

export const databaseNameFrom = (connectionString: string) => {
    const databaseName = decodeURIComponent(
        new URL(connectionString).pathname.replace(/^\/+/, ''),
    )

    if (!/^[A-Za-z0-9_]+$/.test(databaseName)) {
        throw new Error(
            'Database names used by the bootstrapper may only contain letters, numbers, and underscores',
        )
    }

    return databaseName
}

const compactUuidV7Pattern = /^[0-9a-f]{12}7[0-9a-f]{3}[89ab][0-9a-f]{15}$/

export const createTestDatabaseName = (baseDatabaseName: string) => {
    const databaseName = `${baseDatabaseName}_${uuidV7().replaceAll('-', '')}`

    if (databaseName.length > 63) {
        throw new Error(
            `Generated test database name exceeds PostgreSQL's 63-character limit: ${databaseName}`,
        )
    }

    return databaseName
}

const selectStaleTestDatabases = (
    baseDatabaseName: string,
    databaseNames: string[],
) => {
    const prefix = `${baseDatabaseName}_`
    const cutoff = Date.now() - testDatabaseMaxAgeMs

    return databaseNames.filter((databaseName) => {
        if (!databaseName.startsWith(prefix)) {
            return false
        }

        const suffix = databaseName.slice(prefix.length)

        if (!compactUuidV7Pattern.test(suffix)) {
            return false
        }

        const createdAt = Number.parseInt(suffix.slice(0, 12), 16)

        return createdAt < cutoff
    })
}

const adminClient = (connectionString: string) =>
    postgresJs(connectionString, {
        database: 'postgres',
        onnotice: () => {
            /* EMPTY */
        },
    })

type CleanupFailure = {
    databaseName: string
    error: unknown
}

export const cleanupTestDatabases = async (connectionString: string) => {
    const baseDatabaseName = databaseNameFrom(connectionString)
    const setupClient = adminClient(connectionString)
    let droppedCount = 0
    const failures: CleanupFailure[] = []

    try {
        const databases = await setupClient<{ datname: string }[]>`
            SELECT datname
            FROM pg_database
        `
        const databaseNames = databases.map(({ datname }) => datname)
        const targets = selectStaleTestDatabases(
            baseDatabaseName,
            databaseNames,
        )

        for (const databaseName of targets) {
            try {
                await setupClient.unsafe(
                    `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE);`,
                )
                droppedCount++
            } catch (error) {
                failures.push({ databaseName, error })
            }
        }
    } finally {
        await setupClient.end()
    }

    return { droppedCount, failures }
}

export const dropDatabase = async (connectionString: string) => {
    const databaseName = databaseNameFrom(connectionString)
    const setupClient = adminClient(connectionString)

    try {
        await setupClient.unsafe(
            `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE);`,
        )
    } finally {
        await setupClient.end()
    }
}

export const recreateDatabase = async (connectionString: string) => {
    const databaseName = databaseNameFrom(connectionString)
    const setupClient = adminClient(connectionString)

    console.log(
        `bootstrap: Creating database "${databaseName}" and applying migrations...`,
    )

    try {
        await setupClient.unsafe(
            `DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE);`,
        )
        await setupClient.unsafe(`CREATE DATABASE "${databaseName}";`)
    } finally {
        await setupClient.end()
    }

    const migrationClient = postgresJs(connectionString, {
        onnotice: () => {
            /* EMPTY */
        },
    })
    const database = drizzle({ client: migrationClient })

    try {
        console.log('bootstrap: Applying default migrations...')
        await migrate(database, {
            migrationsFolder: defaultMigrationsFolder,
        })

        console.log('bootstrap: Applying test migrations...')
        await migrate(database, {
            migrationsFolder: testMigrationsFolder,
        })
    } finally {
        await migrationClient.end()
    }
}
