module.exports = {
    root: true,
    env: {
        browser: true,
        node: true,
    },
    extends: ['prettier', 'airbnb-base', 'plugin:prettier/recommended'],
    plugins: ['prettier'],
    ignorePatterns: [
        '**/bundle-devel/*.js',
        '/heckheating/*',
        '/node_modules/*',
    ],
    // add your custom rules here
    rules: {
        // let prettier handle this stuff, it does it better
        indent: ['off', 4],
        'max-len': [
            'off',
            {
                code: 80,
                ignoreRegExpLiterals: true,
                ignoreTemplateLiterals: true,
                ignoreStrings: true,
                ignoreTrailingComments: true,
                ignoreUrls: true,
                ignorePattern: '^(\\s+)?.+=".+"', // HTML strings in Vue
            },
        ],
    },
};
