'use strict';

module.exports = {
  root: true,
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  },
  plugins: [
    'ember',
  ],
  extends: [
    'eslint:recommended',
    'plugin:ember/recommended',
  ],
  env: {
    browser: true,
    es6: true,
  },
  rules: {
    // Syntax conventions
    'camelcase': 'error',
    'curly': ['error', 'multi-line'],
    'semi': 'error',
    'quote-props': ['error', 'consistent-as-needed'],
    'yoda': 'error',
    'object-shorthand': ['error', 'methods'],
    'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'comma-dangle': ['error', 'always-multiline'],
    'arrow-parens': ['error', 'as-needed', { requireForBlockBody: true }],
    'operator-linebreak': ['error', 'before'],
    'one-var': ['error', 'never'],

    // Whitespace conventions
    'space-before-blocks': 'error',
    'spaced-comment': 'error',
    'space-in-parens': 'error',
    'arrow-spacing': 'error',
    'no-trailing-spaces': 'error',
    'space-before-function-paren': ['error', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always',
    }],
    'object-curly-spacing': ['error', 'always'],
    'no-multi-spaces': 'error',
    'eol-last': 'error',
    // Bug in eslint requires passing an empty configuration hash when overriding a plugin's configuration
    // See https://github.com/eslint/eslint/issues/6955
    'keyword-spacing': ['error', {}],
    'template-curly-spacing': 'error',

    // Semantic checks
    'eqeqeq': 'error',
    'no-unused-vars': ['error', { vars: 'all', args: 'none' }],
    'no-var': 'error',
    'prefer-const': 'error',

    // Disabled rules
    'no-empty': 0,
    'require-yield': 0,
    'generator-star-spacing': 0,
    'new-cap': 0,
    'dot-notation': 0,

    // Ember plugin rules
    'ember/avoid-leaking-state-in-ember-objects': ['error', [
      // ignored properties
      'propTypes',
      'localClassNames',
      'localClassNameBindings',
      // default ignored properties from rule implementation
      // See https://github.com/ember-cli/eslint-plugin-ember/issues/182
      'classNames',
      'classNameBindings',
      'actions',
      'concatenatedProperties',
      'mergedProperties',
      'positionalParams',
      'attributeBindings',
      'queryParams',
      'attrs',
    ]],
    'ember/avoid-leaking-state-in-components': ['error', [
      // ignored properties
      'propTypes',
      'localClassNames',
      'localClassNameBindings',
    ]],
  },
};
