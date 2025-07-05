import js from '@eslint/js';
import globals from 'globals';

export default [
  // Base configuration
  js.configs.recommended,
  
  // Global settings
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        // Chrome Extension APIs
        chrome: 'readonly',
        // D3.js global
        d3: 'readonly',
        // Testing globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly'
      }
    },
    
    rules: {
      // Error Prevention
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
      
      // Best Practices
      'eqeqeq': ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-arrow-callback': 'error',
      'arrow-spacing': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-vars': ['error', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],
      
      // Code Style
      'indent': ['error', 2, { SwitchCase: 1 }],
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'comma-dangle': ['error', 'never'],
      'object-curly-spacing': ['error', 'always'],
      'array-bracket-spacing': ['error', 'never'],
      'space-before-function-paren': ['error', {
        anonymous: 'never',
        named: 'never',
        asyncArrow: 'always'
      }],
      
      // Chrome Extension Specific
      'no-undef': 'error',
      'no-global-assign': 'error',
      'no-implicit-globals': 'error'
    }
  },
  
  // Chrome Extension specific files
  {
    files: ['background.js', 'content.js'],
    languageOptions: {
      globals: {
        ...globals.webextensions
      }
    },
    rules: {
      'no-console': 'off' // Allow console in background scripts
    }
  },
  
  // Viewer files (have access to DOM)
  {
    files: ['viewer/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        window: 'readonly',
        document: 'readonly',
        HTMLElement: 'readonly'
      }
    }
  },
  
  // Test files
  {
    files: ['test/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-console': 'off'
    }
  },
  
  // Source files
  {
    files: ['src/**/*.js'],
    rules: {
      // Stricter rules for core logic
      'complexity': ['warn', 10],
      'max-depth': ['warn', 4],
      'max-lines-per-function': ['warn', 50]
    }
  },
  
  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'web-ext-artifacts/**',
      'node_modules/**',
      'libs/**',
      '*.min.js',
      'coverage/**'
    ]
  }
];
