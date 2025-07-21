const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'jyvsgzpq_admin',
  password: process.env.DB_PASSWORD || 'AhmadFznX04',
  database: process.env.DB_NAME || 'jyvsgzpq_absensi',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // acquireTimeout: 60000,
  // timeout: 60000,
  // reconnect: true,
  charset: 'utf8mb4'
});

// Test connection with better error handling
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    console.log(`Connected to: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    console.log(`Database: ${process.env.DB_NAME || 'absensi'}`);
    connection.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Connection details:');
    console.error(`- Host: ${process.env.DB_HOST || 'localhost'}`);
    console.error(`- Port: ${process.env.DB_PORT || 3306}`);
    console.error(`- User: ${process.env.DB_USER || 'root'}`);
    console.error(`- Database: ${process.env.DB_NAME || 'absensi'}`);
    console.error('Please ensure:');
    console.error('1. MySQL service is running');
    console.error('2. Database credentials are correct');
    console.error('3. Database exists');
    console.error('4. User has proper permissions');
  }
};

testConnection();

module.exports = pool;