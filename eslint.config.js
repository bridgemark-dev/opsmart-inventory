import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        // App-level globals defined in separate script files
        showToast:       'readonly',
        toggleSidebar:   'readonly',
        toggleMobile:    'readonly',
        handleSearch:    'readonly',
        toggleNotif:     'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'warn',
      'no-console':     'off',
      // Cross-file function references will be resolved when TypeScript is added in Phase 2
      'no-undef':       'warn',
    },
  },
];
