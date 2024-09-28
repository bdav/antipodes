import { defineConfig } from 'vite';
import EnvironmentPlugin from 'vite-plugin-environment';

export default defineConfig({
  build: {
    outDir: 'dist',
  },
  server: {
    open: '/index.html', // Changed from 'antipode.html' to 'index.html'
  },
  plugins: [
    EnvironmentPlugin('all'), // This will make environment variables available
  ],
});
