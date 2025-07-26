import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      external: [
        // Exclude native binaries from bundling
        /\.node$/,
      ],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom']
        }
      }
    },
    commonjsOptions: {
      exclude: [
        // Exclude native modules
        /\.node$/,
        /node_modules\/@tailwindcss\/oxide.*\.node$/
      ]
    }
  },
  optimizeDeps: {
    exclude: [
      // Exclude native binaries from optimization
      '@tailwindcss/oxide-win32-x64-msvc'
    ]
  },
  server: {
    host: "0.0.0.0",
    port: 3001,
  }
})