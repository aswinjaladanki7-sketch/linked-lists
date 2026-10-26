import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    strictPort: true,
    fs: {
      strict: false,
      allow: ['.']
    }
  },
  assetsInclude: ['**/*.wasm']
});
