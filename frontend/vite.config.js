/*
 * Sistem Absensi Proyek
 * Copyright (c) 2025 Ahmad Fauzan
 * 
 * Licensed for PERSONAL and INTERNAL USE ONLY.
 * Redistribution, publication, or COMMERCIAL USE without prior written permission is strictly prohibited.
 * 
 * For commercial licensing requests, please contact: [email@example.com]
 */

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