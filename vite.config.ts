import { existsSync } from 'fs';
import { resolve } from 'path';
import { defineConfig, loadEnv } from 'vite';

// Load environment variables
const env = loadEnv('', process.cwd());

// Get example name from environment or default to 'basic-scene'
const exampleName = env.VITE_EXAMPLE || 'basic-scene';

// Validate example exists and has required files
const examplePath = resolve(__dirname, `./examples/${exampleName}`);
const indexHtmlPath = resolve(examplePath, 'index.html');

if (!existsSync(examplePath)) {
  console.error(`Example "${exampleName}" not found in examples directory`);
  process.exit(1);
}

if (!existsSync(indexHtmlPath)) {
  console.error(`Example "${exampleName}" is missing index.html file`);
  process.exit(1);
}

export default defineConfig({
  base: './',
  root: examplePath,
  server: {
    port: parseInt(env.PORT || '3000', 10),
    open: true,
    host: true, // Listen on all addresses
  },
  build: {
    outDir: resolve(__dirname, `dist/${exampleName}`),
    sourcemap: true,
    rollupOptions: {
      input: {
        main: indexHtmlPath,
      },
    },
  },
  resolve: {
    alias: {
      srcRoot: resolve(__dirname, './src'),
    },
  },
  // Add TypeScript support
  optimizeDeps: {
    include: ['@babylonjs/core', '@babylonjs/gui', '@babylonjs/loaders'],
  },
});
