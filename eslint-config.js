'use strict';

const commonOverrideRules = {
    'no-warning-comments': 'off',
    'sort-imports': 'off'
};

module.exports = {
    root: true,
    ignorePatterns: [
        '/dist/',
        '/lib/',
        '/out/'
    ],
    overrides: [{
        files: ['*.js'],
        env: {
            node: true,
            es2020: true
        },
        extends: ['@nw55/eslint-config/build/es'],
        rules: commonOverrideRules
    }, {
        files: ['src/**/*.ts'],
        parserOptions: {
            project: './tsconfig.json'
        },
        extends: ['@nw55/eslint-config/build/ts-typecheck'],
        rules: commonOverrideRules
    }, {
        files: ['test/**/*.ts'],
        parserOptions: {
            project: './test/tsconfig.json'
        },
        extends: ['@nw55/eslint-config/build/ts-typecheck'],
        rules: commonOverrideRules
    }]
};
