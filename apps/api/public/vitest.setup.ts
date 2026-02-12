// https://v3.vitest.dev/guide/features.html#unhandled-errors

process.on('uncaughtException', () => {})
process.on('unhandledRejection', () => {})
