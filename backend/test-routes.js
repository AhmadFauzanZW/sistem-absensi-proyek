// Test script to identify problematic routes
const express = require('express');
const app = express();

// Test each route file individually to isolate the issue
const routeFiles = [
  './routes/auth.js',
  './routes/dashboard.js',
  './routes/kehadiran.js',
  './routes/logs.js',
  './routes/izin.js',
  './routes/proyek.js',
  './routes/pekerja.js',
  './routes/manajemenPekerja.js',
  './routes/laporan.js',
  './routes/faceRecognition.js'
];

console.log('Testing route files for path-to-regexp errors...\n');

routeFiles.forEach(routeFile => {
  try {
    console.log(`✓ Testing ${routeFile}...`);
    const route = require(routeFile);
    app.use('/test', route);
    console.log(`✓ ${routeFile} loaded successfully`);
  } catch (error) {
    console.error(`✗ Error in ${routeFile}:`, error.message);
    if (error.message.includes('Missing parameter name')) {
      console.error(`  → This file contains the problematic route parameter!`);
    }
  }
});

console.log('\nRoute testing completed.');
