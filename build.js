import { build } from 'vite';
import { resolve } from 'path';

// Build configuration for standalone file
async function buildStandalone() {
    try {
        await build({
            configFile: false,
            build: {
                lib: {
                    entry: resolve('src/app.js'),
                    name: 'AudioGen',
                    formats: ['iife'],
                    fileName: () => 'app.bundle.js'
                },
                outDir: './',
                emptyOutDir: false,
                rollupOptions: {
                    output: {
                        inlineDynamicImports: true,
                    }
                }
            }
        });
        console.log('Build complete! You can now open index.html directly.');
    } catch (error) {
        console.error('Build failed:', error);
    }
}

buildStandalone();