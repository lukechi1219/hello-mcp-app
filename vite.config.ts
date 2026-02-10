import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: isDev ? 'inline' : false,
    rollupOptions: {
      input: 'src/ui/mcp-app.html',
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
