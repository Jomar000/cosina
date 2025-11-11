# Hyperion
Base Template for SSG + CloudFlare Workers

## Installation Steps
- Install dependencies with `pnpm -r i`
- [packages/backend] Create a copy of `.dev.vars.example` and name it `.dev.vars`.
  - Set the necessary values afterwards.
- [packages/frontend] Create a copy of `.env.example` and name it `.env`.
  - Set the necessary values afterwards.
- Run the migration via `pnpm migrate:dev`
- Execute `pnpm dev` on the `backend` and `frontend` terminal on the lower right of your screen.

## Database Migration
- [packages/backend] Create a copy of `drizzle.config.ts` and name it `drizzle-<staging|production>.config.ts`.
  - Only needed for staging & production environments.
  - Set the necessary values afterwards.
- Run the migration via `pnpm migrate:<staging|production>`

## Notes
- Use `VSCode` or its alternatives and install the recommended extensions.
- Make sure `Node` and `Git` is installed.
