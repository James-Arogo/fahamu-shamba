#!/usr/bin/env node

/**
 * Create Default Admin User
 * Creates the admin account with credentials: arogocarol224@gmail.com / Jemo@721
 * Usage: node create-default-admin.js
 */

import sqlite3 from 'sqlite3';
import { hashPassword } from './admin-auth.js';
import * as adminDB from './admin-database.js';

const db = new sqlite3.Database('./fahamu_shamba.db', (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
});

const dbAsync = {
  run: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve(this);
      });
    }),
  get: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    })
};

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  🌱 Fahamu Shamba - Default Admin Account Setup        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize database if needed
    adminDB.initializeAdminDatabase(db, dbAsync);

    // Check if admin already exists
    const existingAdmin = await dbAsync.get(
      'SELECT id FROM admin_users WHERE email = ?',
      ['arogocarol224@gmail.com']
    );

    if (existingAdmin) {
      console.log('⚠️  Admin account already exists');
      console.log('\nEmail:    arogocarol224@gmail.com');
      console.log('Password: Jemo@721');
      console.log('\nTo reset, run: sqlite3 fahamu_shamba.db');
      console.log('Then: DELETE FROM admin_users WHERE email = "arogocarol224@gmail.com";\n');
      db.close();
      return;
    }

    console.log('⏳ Creating default admin account...\n');

    const email = 'arogocarol224@gmail.com';
    const password = 'Jemo@721';
    const passwordHash = hashPassword(password);

    const result = await adminDB.createAdminUser(
      dbAsync,
      email,
      passwordHash,
      'System',
      'Administrator',
      'super_admin',
      'setup-script'
    );

    console.log('✅ Admin account created successfully!\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log(`║  Email:    arogocarol224@gmail.com                     ║`);
    console.log(`║  Password: Jemo@721                                    ║`);
    console.log(`║  Role:     Super Admin (Full Access)                   ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📚 Next Steps:\n');
    console.log('1. Start the server: npm start');
    console.log('2. Open: http://localhost:5000/admin');
    console.log('3. Login with the credentials above');
    console.log('4. Check email for OTP verification code');
    console.log('5. Enter OTP to complete login\n');

    console.log('📧 Email Configuration:\n');
    console.log('The system is configured to send OTP codes via email.');
    console.log('Add these to your .env file for email functionality:\n');
    console.log('EMAIL_USER=your-email@gmail.com');
    console.log('EMAIL_PASSWORD=your-app-password\n');
    console.log('Note: Use App Password, not your regular password\n');

    console.log('🔐 Security Reminder:\n');
    console.log('• Change password after first login');
    console.log('• Save the OTP email for authentication');
    console.log('• Keep credentials secure\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
