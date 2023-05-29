import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'APEXOffGrid',
      fileName: () => `apex-off-grid.min.js`,
      formats: ['iife'],
    },
    minify: true,
    target: ['safari16', 'chrome113', 'firefox112'],
    assetsDir: '',
  },
});
