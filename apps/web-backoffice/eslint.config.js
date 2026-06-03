import betterTailwindcss from 'eslint-plugin-better-tailwindcss'

import rootConfig from '../../eslint.config.js'
import svelteConfig from './svelte.config.js'

export default [
    ...rootConfig,
    {
        files: [
            '**/*.svelte',
            '**/*.svelte.ts',
            '**/*.svelte.js',
        ],
        languageOptions: {
            parserOptions: {
                svelteConfig,
            },
        },
        plugins: {
            'better-tailwindcss': betterTailwindcss,
        },
        rules: {
            'better-tailwindcss/enforce-canonical-classes': 'warn',
        },
        settings: {
            'better-tailwindcss': {
                cwd: '.',
                entryPoint: './src/app.css',
            },
        },
    },
]
