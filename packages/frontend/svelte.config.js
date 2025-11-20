import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { loadEnv } from 'vite'

const mode =
    process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] || ''

const env = loadEnv(mode, process.cwd(), '')

/**
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
    // Consult https://kit.svelte.dev/docs/integrations#preprocessors
    // for more information about preprocessors
    preprocess: vitePreprocess(),

    kit: {
        // adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
        // If your environment is not supported or you settled on a specific environment, switch out the adapter.
        // See https://kit.svelte.dev/docs/adapters for more information about adapters.
        adapter: adapter({
            pages: 'dist',
        }),
        prerender: {
            handleHttpError: 'warn',
        },
        csp: {
            mode: 'hash',
            directives: {
                'base-uri': ['self'],
                'connect-src': [
                    'self',
                    `${env.PUBLIC_API_URL}/`,
                ],
                'default-src': ['self'],
                'font-src': ['*'],
                'form-action': ['self'],
                'frame-src': [
                    'self',
                    'https://challenges.cloudflare.com/',
                ],
                'img-src': ['*'],
                'manifest-src': ['self'],
                'media-src': ['*'],
                'object-src': ['none'],
                'script-src': [
                    'self',
                    'https://challenges.cloudflare.com/',
                    'https://static.cloudflareinsights.com/',
                ],
                'style-src': [
                    'self',
                    'unsafe-inline',
                ],
                'worker-src': [
                    'self',
                    'blob:',
                ],
            },
        },
    },
    compilerOptions: {
        hmr: process.env.NODE_ENV === 'development',
        modernAst: true,
        warningFilter: (warning) => {
            /**
             * Ignored Warnings
             * https://github.com/sveltejs/language-tools/issues/650#issuecomment-2260462839
             */

            const ignoredWarningCodes = [
                'a11y_invalid_attribute',
            ]

            return !(
                ignoredWarningCodes.includes(warning.code) ||
                warning.filename?.includes('node_modules')
            )
        },
    },
}

export default config
