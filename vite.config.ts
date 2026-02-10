import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const input = process.env.INPUT;
if (!input) {
  throw new Error('INPUT environment variable is required (e.g. INPUT=src/ui/mcp-app.html)');
}

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: isDev ? 'inline' : false,
    rollupOptions: {
      input,
      output: {
        entryFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    minify: isDev ? false : 'esbuild',
    cssMinify: !isDev,
    assetsInlineLimit: 100000000
  }
});
