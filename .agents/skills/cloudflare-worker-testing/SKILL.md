---
name: cloudflare-worker-testing
description: Checklist and rules for debugging or writing vitest tests targeting Cloudflare Workers.
---

# Testing: Cloudflare Workers (vitest-pool-workers)

- **Storage Isolation:** `@cloudflare/vitest-pool-workers` ^0.13.4 isolates storage **per test file** (not per `it()` block). All writes to KV, R2, D1, Durable Objects, and Caches persist across `it()` blocks within the same file and are reset between files.
    - Data seeded in `beforeAll()` persists across all `it()` blocks within the file.
    - Data written inside an `it()` block **is visible** in subsequent `it()` blocks within the same file.
    - Database writes (Postgres via Hyperdrive) are **never** covered by storage isolation — they persist globally.
- **Debugging Checklist:** When tests fail due to missing or unexpected data:
    1. Check if the data comes from a different test file — storage is isolated per file.
    2. Move shared setup (e.g., token generation, data seeding) into `beforeAll()`.
    3. Verify whether the storage backend changed (e.g., better-auth moving from DB to KV when `secondaryStorage` is configured) — the data may exist but in a different location than expected.
