// ESLint Flat Configuration
// https://eslint.org/docs/latest/use/configure/migration-guide#start-using-flat-config-files

// ESLint Rules
// https://eslint.org/docs/latest/rules/

import { includeIgnoreFile } from '@eslint/compat'
import js from '@eslint/js'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import { fileURLToPath } from 'node:url'
import ts from 'typescript-eslint'

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url))
const webBackofficePath = fileURLToPath(
    new URL('./apps/web-backoffice', import.meta.url),
)
const webPublicPath = fileURLToPath(
    new URL('./apps/web-public', import.meta.url),
)
const uiPackagePath = fileURLToPath(new URL('./packages/ui', import.meta.url))

export default defineConfig(
    includeIgnoreFile(gitignorePath),
    {
        ignores: ['apps/api-*/src/worker-configuration.d.ts'],
    },
    js.configs.recommended,
    ...ts.configs.recommended,
    ...svelte.configs.recommended,
    prettier,
    ...svelte.configs.prettier,
    {
        // Rule Overrides
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            '@typescript-eslint/no-unused-expressions': [
                'error',
                { allowShortCircuit: true, allowTernary: true },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    destructuredArrayIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            eqeqeq: [
                'error',
                'always',
            ],
            'no-throw-literal': ['error'],
            // typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
            // see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
            'no-undef': 'off',
            'no-useless-concat': ['error'],
            'no-useless-assignment': ['warn'],
            'no-unused-expressions': 'off',
            'no-var': ['error'],
            'prefer-template': ['error'],
            'svelte/no-navigation-without-resolve': 'off',
        },
    },
    {
        basePath: webBackofficePath,
        files: ['**/*.{js,ts,svelte}'],
        plugins: {
            'better-tailwindcss': betterTailwindcss,
        },
        rules: {
            'better-tailwindcss/enforce-canonical-classes': 'warn',
            'better-tailwindcss/no-conflicting-classes': 'warn',
            'better-tailwindcss/no-deprecated-classes': 'warn',
            'better-tailwindcss/no-duplicate-classes': 'warn',
        },
        settings: {
            'better-tailwindcss': {
                cwd: webBackofficePath,
                entryPoint: './src/app.css',
            },
        },
    },
    {
        basePath: webPublicPath,
        files: ['**/*.{js,ts,svelte}'],
        plugins: {
            'better-tailwindcss': betterTailwindcss,
        },
        rules: {
            'better-tailwindcss/enforce-canonical-classes': 'warn',
            'better-tailwindcss/no-conflicting-classes': 'warn',
            'better-tailwindcss/no-deprecated-classes': 'warn',
            'better-tailwindcss/no-duplicate-classes': 'warn',
        },
        settings: {
            'better-tailwindcss': {
                cwd: webPublicPath,
                entryPoint: './src/app.css',
            },
        },
    },
    {
        basePath: uiPackagePath,
        files: ['**/*.{js,ts,svelte}'],
        plugins: {
            'better-tailwindcss': betterTailwindcss,
        },
        rules: {
            'better-tailwindcss/enforce-canonical-classes': 'warn',
            'better-tailwindcss/no-conflicting-classes': 'warn',
            'better-tailwindcss/no-deprecated-classes': 'warn',
            'better-tailwindcss/no-duplicate-classes': 'warn',
        },
        settings: {
            'better-tailwindcss': {
                cwd: uiPackagePath,
                entryPoint: './src/styles/globals.css',
            },
        },
    },
    {
        files: [
            '**/*.svelte',
            '**/*.svelte.ts',
            '**/*.svelte.js',
        ],
        languageOptions: {
            parserOptions: {
                projectService: true,
                extraFileExtensions: ['.svelte'],
                parser: ts.parser,
            },
        },
    },
)
