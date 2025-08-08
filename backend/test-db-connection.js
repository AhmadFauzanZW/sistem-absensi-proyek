/*
 * Sistem Absensi Proyek
 * Copyright (c) 2025 Ahmad Fauzan
 * 
 * Licensed for PERSONAL and INTERNAL USE ONLY.
 * Redistribution, publication, or COMMERCIAL USE without prior written permission is strictly prohibited.
 * 
 * For commercial licensing requests, please contact: [email@example.com]
 */

// Database connection test script
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');

  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_NAME || 'absensi'
  };

  console.log('Configuration:');
  console.log(`- Host: ${config.host}`);
  console.log(`- Port: ${config.port}`);
  console.log(`- User: ${config.user}`);
  console.log(`- Database: ${config.database}\n`);

  try {
    // Test connection
    const connection = await mysql.createConnection(config);
    console.log('✅ Database connection successful!');

    // Test basic query
    const [results] = await connection.execute('SELECT 1 as test');
    console.log('✅ Basic query test passed');

    // Test if main tables exist
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ?
    `, [config.database]);

    console.log(`✅ Found ${tables.length} tables in database`);

    await connection.end();
    console.log('✅ Connection closed successfully');

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error(`Error: ${error.message}`);
    console.error(`Code: ${error.code}`);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Solutions:');
      console.error('1. Start MySQL service: net start mysql (Windows) or sudo service mysql start (Linux)');
      console.error('2. Check if MySQL is running on the correct port');
      console.error('3. Verify firewall settings');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 Solutions:');
      console.error('1. Check username and password');
      console.error('2. Grant proper permissions to the user');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\n💡 Solutions:');
      console.error('1. Create the database first');
      console.error('2. Check database name spelling');
    }
  }
}

testDatabaseConnection();
