---
name: ai-model-selection
description: Use this when selecting the appropriate Claude or Gemini model tier for a task.
---

# AI Model Selection

Use the appropriate model based on task complexity and scope. Each tier lists the Claude and Gemini equivalents.

> **Note:** Always use the latest available version of each model (e.g., Claude Opus 4.6 over 4, Gemini 3.1 Pro over 3.0 Pro).

## Tier 1: Deep Reasoning & Architecture — Claude Opus / Gemini Pro

- Planning and designing system architecture (new features, data models, API contracts).
- Evaluating trade-offs between approaches (e.g., auth strategies, caching layers).
- Debugging complex, cross-cutting issues that span multiple packages or services.
- Writing or reviewing security-sensitive code (auth flows, CSP policies, input validation).
- Drafting or revising technical documentation and agentic guidelines.

## Tier 2: Multi-File Implementation & Refactoring — Claude Sonnet / Gemini Pro

- Implementing features that touch multiple files or packages (e.g., new API endpoint + contract + frontend integration).
- Refactoring across the monorepo (renaming exports, restructuring modules, migrating patterns).
- Writing and updating test suites alongside implementation changes.
- Code reviews and PR-level analysis requiring full context of the changeset.
- Integrating third-party libraries or services (e.g., adding a new shadcn component with backend wiring).

## Tier 3: Targeted & Repetitive Tasks — Claude Haiku / Gemini Flash

- Single-file edits: fixing typos, updating imports, adding/removing a dependency.
- Generating boilerplate (new route stubs, Zod schemas from existing types, Drizzle migration scaffolds).
- Running and interpreting CLI commands (build, lint, test).
- Quick lookups: finding file paths, grepping for usages, reading configs.
- Formatting, linting fixes, and other mechanical code transformations.
