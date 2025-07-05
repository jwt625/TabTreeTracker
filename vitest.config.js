import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Global test setup
    globals: true,
    
    // Test file patterns
    include: [
      'test/**/*.{test,spec}.{js,ts}',
      'src/**/*.{test,spec}.{js,ts}',
      'viewer/**/*.{test,spec}.{js,ts}'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      'web-ext-artifacts/**'
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'test/**',
        'libs/**',
        '*.config.js',
        'dist/**',
        'web-ext-artifacts/**'
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    },
    
    // Test timeout
    testTimeout: 10000,
    
    // Setup files
    setupFiles: ['./test/setup.js'],
    
    // Mock Chrome APIs
    deps: {
      inline: ['d3']
    }
  },
  
  // Resolve configuration for imports
  resolve: {
    alias: {
      '@': new URL('./src', import.meta.url).pathname,
      '@viewer': new URL('./viewer', import.meta.url).pathname,
      '@test': new URL('./test', import.meta.url).pathname
    }
  }
});
