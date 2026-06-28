// Drizzle Configuration
// https://orm.drizzle.team/kit-docs/config-reference

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
    dbCredentials: {
        host: 'localhost',
        port: 5432,
        database: 'cosina',
        user: 'postgres',
        password: 'password',
    },
    dialect: 'postgresql',
    out: './src/postgres/migrations/default',
    schema: './src/postgres/schema.ts',
    strict: true,
    verbose: true,
})
