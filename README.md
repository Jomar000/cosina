# Hyperion
Base Template for SSG + CloudFlare Workers

## Installation Steps
- Install dependencies with `pnpm -r i`
- [packages/backend] Create a copy of `.dev.vars.example` and name it `.dev.vars`.
  - Set the necessary values afterwards.
- [packages/backend] Create a copy of `drizzle.config.ts` and name it `drizzle-<env>.config.ts`.
  - Valid values for `<env>` are `dev`, `test`, `staging` and `production`.
  - Set the necessary values afterwards.
- [packages/frontend] Create a copy of `.env.example` and name it `.env`.
  - Set the necessary values afterwards.
- Create the the database and run the migration via `pnpm migrate:<env>`
  - Valid values for `<env>` are `dev`, `test`, `staging` and `production`.
- Execute `pnpm dev` on the `backend` and `frontend` terminal on the lower right of your screen.

## Notes
- Use `VSCode` or its alternatives and install the recommended extensions.
- Make sure `Node` and `Git` is installed.
