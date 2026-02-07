import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      input: process.env.INPUT || 'src/ui/mcp-app.html',
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    minify: 'esbuild',
    cssMinify: true,
    assetsInlineLimit: 100000000 // Inline all assets
  },
  resolve: {
    alias: {
      '@core': '/src/core',
      '@entry': '/src/entry',
      '@ui': '/src/ui'
    }
  }
});
