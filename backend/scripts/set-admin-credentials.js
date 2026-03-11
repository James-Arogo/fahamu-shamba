#!/usr/bin/env node

import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { hashPassword } from '../admin-auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const dbPath = path.resolve(backendDir, 'fahamu_shamba.db');

function getArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

const email = getArg('--email') || 'arogocarol224@gmail.com';
const password = getArg('--password') || 'Jemo@721';
const oldEmail = getArg('--old-email') || 'cjoarogo@gmail.com';

if (!email || !password) {
  console.error('Usage: node scripts/set-admin-credentials.js --email <email> --password <password> [--old-email <email>]');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
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

async function ensureAdminTable() {
  await dbAsync.run(`CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    role TEXT DEFAULT 'admin',
    mfa_enabled BOOLEAN DEFAULT 0,
    mfa_secret TEXT,
    status TEXT DEFAULT 'active',
    last_login DATETIME,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT
  )`);
}

async function main() {
  try {
    await ensureAdminTable();
    const passwordHash = hashPassword(password);

    const target = await dbAsync.get('SELECT id FROM admin_users WHERE email = ?', [email]);

    if (target) {
      await dbAsync.run(
        `UPDATE admin_users
         SET password_hash = ?,
             status = 'active',
             failed_login_attempts = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [passwordHash, target.id]
      );

      console.log(`Updated existing admin account: ${email}`);
      return;
    }

    const old = await dbAsync.get('SELECT id, role, first_name, last_name FROM admin_users WHERE email = ?', [oldEmail]);

    if (old) {
      await dbAsync.run(
        `UPDATE admin_users
         SET email = ?,
             password_hash = ?,
             status = 'active',
             failed_login_attempts = 0,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [email, passwordHash, old.id]
      );

      console.log(`Renamed admin ${oldEmail} -> ${email} and updated password.`);
      return;
    }

    await dbAsync.run(
      `INSERT INTO admin_users
       (email, password_hash, first_name, last_name, role, status, failed_login_attempts, created_by)
       VALUES (?, ?, ?, ?, ?, 'active', 0, 'credential-reset-script')`,
      [email, passwordHash, 'System', 'Administrator', 'super_admin']
    );

    console.log(`Created new admin account: ${email}`);
  } catch (error) {
    console.error('Failed to set admin credentials:', error.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
