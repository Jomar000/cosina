// Prettier Configuration Options
// https://prettier.io/docs/en/options

/** @type {import("prettier").Config} */
const prettierConfig = {
    // Plugin order is important
    plugins: [
        'prettier-plugin-svelte',
        'prettier-plugin-tailwindcss',
        'prettier-plugin-multiline-arrays',
    ],
    semi: false,
    singleAttributePerLine: true,
    singleQuote: true,
    tabWidth: 4,
}

// prettier-plugin-multiline-arrays Options
// https://github.com/electrovir/prettier-plugin-multiline-arrays#options

/** @type {import("prettier-plugin-multiline-arrays").defaultOptions} */
const pluginMultilineArraysConfig = {
    multilineArraysWrapThreshold: 1,
}

// prettier-plugin-tailwindcss Options
// https://github.com/tailwindlabs/prettier-plugin-tailwindcss?tab=readme-ov-file#options

const pluginTailwindCssConfig = {
    tailwindStylesheet: './packages/frontend/src/app.css',
}

// Export Configuration
const config = {
    ...prettierConfig,
    ...pluginMultilineArraysConfig,
    ...pluginTailwindCssConfig,
}

export default config
