/* istanbul ignore file -- @preserve */

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { fileURLToPath } from 'node:url'
import postgresJs from 'postgres'

const defaultMigrationsFolder = fileURLToPath(
    new URL('./migrations/default', import.meta.url),
)

const testMigrationsFolder = fileURLToPath(
    new URL('./migrations/test', import.meta.url),
)

const databaseNameFrom = (connectionString: string) => {
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

const adminClient = (connectionString: string) =>
    postgresJs(connectionString, {
        database: 'postgres',
        onnotice: () => {
            /* EMPTY */
        },
    })

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
