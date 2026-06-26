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
    },
]
