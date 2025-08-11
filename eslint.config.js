// ESLint Flat Configuration
// https://eslint.org/docs/latest/use/configure/migration-guide#start-using-flat-config-files

// ESLint Rules
// https://eslint.org/docs/latest/rules/

// ESLint Parser for Svelte & Typescript
// https://github.com/sveltejs/eslint-plugin-svelte
// https://github.com/sveltejs/svelte-eslint-parser

import eslintJs from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import sveltePlugin from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'

const config = [
    {
        // Global Ignores
        // https://eslint.org/docs/latest/use/configure/configuration-files-new#globally-ignoring-files-with-ignores
        ignores: [
            'packages/*/dist/**',
            'packages/frontend/.svelte-kit/**',
        ],
    },
    {
        // Global Rules
        rules: {
            ...eslintJs.configs.recommended.rules,
            eqeqeq: [
                'error',
                'always',
            ],
            'no-throw-literal': ['error'],
            'no-undef': 'off',
            'no-unused-private-class-members': 'off',
            'no-useless-concat': ['error'],
            'no-var': ['error'],
            'prefer-template': ['error'],
        },
    },
    {
        // TypeScript Rules
        files: [
            '**/*.ts',
            '**/*.cts',
            '**/*.mts',
        ],
        languageOptions: {
            parser: tsParser,
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/no-unused-expressions': [
                'error',
                { allowShortCircuit: true, allowTernary: true },
            ],
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
    {
        // Svelte Rules
        files: ['**/*.svelte'],
        languageOptions: {
            parser: svelteParser,
            parserOptions: {
                parser: tsParser,
            },
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
            svelte: sveltePlugin,
        },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/no-unused-expressions': [
                'error',
                { allowShortCircuit: true, allowTernary: true },
            ],
            '@typescript-eslint/no-unused-vars': 'off',
            ...sveltePlugin.configs.recommended.rules,
            'svelte/valid-compile': [
                'error',
                {
                    ignoreWarnings: true,
                },
            ],
        },
    },
]

export default config
