#!/usr/bin/env node

/**
 * Migration Script: Add Passport Photo Columns to Farmer Profiles
 * 
 * This script adds the following columns to the farmer_profiles table:
 * - passport_photo_url (TEXT): Base64 encoded photo data as data URL
 * - passport_photo_mime_type (TEXT): MIME type of the photo (e.g., image/jpeg)
 * - photo_uploaded_date (DATETIME): When the photo was uploaded
 * 
 * Run this script once to migrate existing databases:
 * node migrate-add-photo-columns.js
 */

import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const db = new sqlite3.Database('./fahamu_shamba.db', (err) => {
  if (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
});

const dbRun = promisify(db.run.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbClose = promisify(db.close.bind(db));

async function runMigration() {
  try {
    console.log('🔄 Starting migration: Add passport photo columns...\n');

    // Check if columns already exist
    console.log('📋 Checking existing columns...');
    const columns = await dbAll("PRAGMA table_info(farmer_profiles)");
    const columnNames = columns.map(col => col.name);

    const columnsToAdd = [
      { name: 'passport_photo_url', type: 'TEXT', exists: columnNames.includes('passport_photo_url') },
      { name: 'passport_photo_mime_type', type: 'TEXT', exists: columnNames.includes('passport_photo_mime_type') },
      { name: 'photo_uploaded_date', type: 'DATETIME', exists: columnNames.includes('photo_uploaded_date') }
    ];

    let addedCount = 0;

    // Add missing columns
    for (const col of columnsToAdd) {
      if (col.exists) {
        console.log(`⏭️  Column '${col.name}' already exists, skipping...`);
      } else {
        console.log(`➕ Adding column '${col.name}' (${col.type})...`);
        await dbRun(`ALTER TABLE farmer_profiles ADD COLUMN ${col.name} ${col.type}`);
        addedCount++;
      }
    }

    if (addedCount === 0) {
      console.log('\n✅ All photo columns already exist! No migration needed.');
    } else {
      console.log(`\n✅ Successfully added ${addedCount} new column(s) to farmer_profiles table!`);
    }

    console.log('\n📊 Updated schema:');
    const updatedColumns = await dbAll("PRAGMA table_info(farmer_profiles)");
    updatedColumns.forEach(col => {
      if (col.name.includes('photo') || col.name === 'photo_uploaded_date') {
        console.log(`   - ${col.name}: ${col.type}`);
      }
    });

    console.log('\n✨ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
