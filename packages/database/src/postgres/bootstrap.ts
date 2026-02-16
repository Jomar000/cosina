/* istanbul ignore file -- @preserve */

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgresJs from 'postgres'

const connectionString = process.env.DATABASE_URL ?? ''
const environment = process.env.NODE_ENV ?? ''

// This bootstrapper is purely for DEV & TEST environments
// Use the drizzle-kit CLI for processing STAGING & PRODUCTION environments
if (
    ![
        'development',
        'test',
    ].includes(environment)
) {
    throw new Error('Invalid environment provided. Valid values are [dev|test]')
}

const setupClient = postgresJs(connectionString, {
    database: 'postgres', // Override
    onnotice: () => {
        /* EMPTY */
    },
})

// Used only to parse the connectionString
const migrationClient = postgresJs(connectionString, {
    onnotice: () => {
        /* EMPTY */
    },
})

console.log(
    `bootstrap: Creating database "${migrationClient.options.database}" and applying migrations...`,
)

await setupClient.unsafe(
    `DROP DATABASE IF EXISTS ${migrationClient.options.database} WITH (FORCE);`,
)

await setupClient.unsafe(`CREATE DATABASE ${migrationClient.options.database};`)

await migrate(drizzle(connectionString), {
    migrationsFolder: './src/postgres/migrations',
})

await setupClient.end()
await migrationClient.end()

console.log('bootstrap: OPERATION COMPLETED. 🚀')

process.exit(0)
