// Drizzle Configuration
// https://orm.drizzle.team/kit-docs/config-reference

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
    dbCredentials: {
        host: 'localhost',
        port: 5432,
        database: 'hyperion',
        user: 'postgres',
        password: 'password',
    },
    dialect: 'postgresql',
    out: './src/postgres/migrations',
    schema: './src/postgres/schema.ts',
    casing: 'snake_case',
    strict: true,
    verbose: true,
})
