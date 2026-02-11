/* istanbul ignore file -- @preserve */

import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import postgresJs from 'postgres'
import { parse } from 'smol-toml'

const isNodeCompatible =
    typeof process !== 'undefined' &&
    typeof process.versions !== 'undefined' &&
    typeof process.versions.node !== 'undefined'

if (!isNodeCompatible) {
    throw new Error(
        'Database bootstrapping must be run in NodeJS compatible runtime.',
    )
}

const environment = process.argv[2].toLowerCase() as 'dev' | 'test'

// This bootstrapper is purely for DEV & TEST environments
// Use the drizzle-kit CLI for processing STAGING & PRODUCTION environments
if (
    ![
        'dev',
        'test',
    ].includes(environment)
) {
    throw new Error('Invalid environment provided. Valid values are [dev|test]')
}

////
// Parse wrangler.toml configuration
////

const wranglerConfigPath = fileURLToPath(
    new URL('../../../wrangler.toml', import.meta.url),
)

const wranglerConfig = readFileSync(wranglerConfigPath, 'utf-8')

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parsed = parse(wranglerConfig) as any

const connectionString =
    environment === 'dev'
        ? parsed.hyperdrive[0].localConnectionString
        : parsed.env['test'].hyperdrive[0].localConnectionString

////
// DB Setup & Migration
////

const setupClient = postgresJs(connectionString, {
    database: 'postgres', // Override
    onnotice: () => {
        /* EMPTY */
    },
})

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

/**
 * Broken in Drizzle V1
 * Directly use the connectionString until a fix is implemented
 */
// await migrate(drizzle(migrationClient), {
//     migrationsFolder: './src/db/pg/migrations',
// })

await migrate(drizzle(connectionString), {
    migrationsFolder: './src/db/pg/migrations',
})

await migrationClient.end()
await setupClient.end()

console.log('bootstrap: OPERATION COMPLETED. 🚀')

process.exit(0)
