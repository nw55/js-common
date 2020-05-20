'use strict';

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
        extends: [
            '@nw55/eslint-config/build/es'
        ],
        rules: {
            'no-warning-comments': 'off'
        }
    }, {
        files: ['*.ts'],
        parserOptions: {
            project: './tsconfig.prod.json'
        },
        extends: [
            '@nw55/eslint-config/build/ts-typecheck'
        ],
        rules: {
            'no-warning-comments': 'off'
        }
    }]
};
