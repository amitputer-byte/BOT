import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/* Build target: ONE self-contained, offline HTML file (the distribution format).
 * vite-plugin-singlefile inlines all JS/CSS into dist/index.html — no external
 * requests at runtime, matching the offline-first constraint. */
export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'es2018',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    rollupOptions: {
      output: { inlineDynamicImports: true }
    }
  }
});
