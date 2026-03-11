#!/usr/bin/env node

/**
 * Setup Script: Create Initial Admin User
 * Run this ONCE to create the first super admin account
 * Usage: node setup-admin.js
 */

import sqlite3 from 'sqlite3';
import readline from 'readline';
import { hashPassword } from './admin-auth.js';
import * as adminDB from './admin-database.js';
import { initializeEmailService } from './email-service.js';

const db = new sqlite3.Database('./fahamu_shamba.db', (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Promise wrapper for database
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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function validatePassword(password) {
  if (password.length < 8) {
    console.log('❌ Password must be at least 8 characters');
    return false;
  }
  if (!/[A-Z]/.test(password)) {
    console.log('❌ Password must contain uppercase letter');
    return false;
  }
  if (!/[a-z]/.test(password)) {
    console.log('❌ Password must contain lowercase letter');
    return false;
  }
  if (!/[0-9]/.test(password)) {
    console.log('❌ Password must contain number');
    return false;
  }
  return true;
}

async function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log('❌ Invalid email format');
    return false;
  }
  
  const existing = await dbAsync.get(
    'SELECT id FROM admin_users WHERE email = ?',
    [email]
  );
  
  if (existing) {
    console.log('❌ Email already exists');
    return false;
  }
  
  return true;
}

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  🌱 Fahamu Shamba - Admin Account Setup               ║');
  console.log('║  Create the initial Super Admin account                ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize database if needed
    adminDB.initializeAdminDatabase(db, dbAsync);

    // Check if admin already exists
    const adminCount = await dbAsync.get(
      'SELECT COUNT(*) as count FROM admin_users'
    );

    if (adminCount && adminCount.count > 0) {
      console.log('⚠️  Admin accounts already exist in the system.');
      const response = await question('Create another admin? (y/n): ');
      if (response.toLowerCase() !== 'y') {
        console.log('✅ Setup cancelled\n');
        rl.close();
        db.close();
        return;
      }
    }

    console.log('\n📝 Enter admin account details:\n');

    // Get email
    let email;
    while (!email) {
      email = await question('Email address: ');
      if (!await validateEmail(email)) {
        email = null;
      }
    }

    // Get first name
    const firstName = await question('First name: ');
    if (!firstName.trim()) {
      console.log('❌ First name required');
      throw new Error('First name required');
    }

    // Get last name
    const lastName = await question('Last name: ');
    if (!lastName.trim()) {
      console.log('❌ Last name required');
      throw new Error('Last name required');
    }

    // Get password
    console.log('\n🔐 Password Requirements:');
    console.log('   • Minimum 8 characters');
    console.log('   • At least one uppercase letter');
    console.log('   • At least one lowercase letter');
    console.log('   • At least one number\n');

    let password;
    while (!password) {
      password = await question('Password: ');
      if (!await validatePassword(password)) {
        password = null;
      }
    }

    // Confirm password
    const confirmPassword = await question('Confirm password: ');
    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      throw new Error('Passwords do not match');
    }

    // Get role
    console.log('\n👤 Admin Role:');
    console.log('   1. Super Admin (full system access)');
    console.log('   2. Admin (standard administrative access)');
    console.log('   3. Moderator (limited operational access)');
    
    const roleChoice = await question('\nSelect role (1-3): ');
    const roles = { '1': 'super_admin', '2': 'admin', '3': 'moderator' };
    const role = roles[roleChoice] || 'admin';

    console.log('\n⏳ Creating admin account...\n');

    // Hash password
    const passwordHash = hashPassword(password);

    // Create admin user
    const result = await adminDB.createAdminUser(
      dbAsync,
      email,
      passwordHash,
      firstName.trim(),
      lastName.trim(),
      role,
      'setup-script'
    );

    console.log('✅ Admin account created successfully!\n');
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log(`║  Email:     ${email.padEnd(44)} ║`);
    console.log(`║  Name:      ${`${firstName} ${lastName}`.padEnd(44)} ║`);
    console.log(`║  Role:      ${role.padEnd(44)} ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📚 Next steps:');
    console.log('   1. Start the server: npm start');
    console.log(`   2. Visit admin dashboard: http://localhost:5000/admin`);
    console.log(`   3. Login with: ${email}\n`);

    console.log('🔐 Security Tips:');
    console.log('   • Enable MFA for this account in the dashboard');
    console.log('   • Store the password securely');
    console.log('   • Create additional admin accounts through the dashboard');
    console.log('   • Review security logs regularly\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    db.close();
  }
}

main();
