import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const dbPath = path.resolve(backendDir, process.env.DB_PATH || 'fahamu_shamba.db');
const backupDir = path.resolve(backendDir, process.env.BACKUP_DIR || 'backups');

function getArg(name) {
  const index = process.argv.findIndex((arg) => arg === name);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

async function getLatestBackupFolder() {
  const entries = await fsp.readdir(backupDir, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('backup-'))
    .map((entry) => entry.name)
    .sort();

  if (folders.length === 0) return null;
  return path.join(backupDir, folders[folders.length - 1]);
}

function integrityCheck(targetDbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(targetDbPath, (openErr) => {
      if (openErr) return reject(openErr);
      db.get('PRAGMA integrity_check;', (err, row) => {
        db.close();
        if (err) return reject(err);
        resolve(row);
      });
    });
  });
}

async function main() {
  const fromArg = getArg('--from');
  const dryRun = hasFlag('--dry-run');

  const sourceFolder = fromArg
    ? path.resolve(fromArg)
    : await getLatestBackupFolder();

  if (!sourceFolder || !fs.existsSync(sourceFolder)) {
    throw new Error('Backup folder not found. Use --from <path> or create a backup first.');
  }

  const sourceDb = path.join(sourceFolder, path.basename(dbPath));
  if (!fs.existsSync(sourceDb)) {
    throw new Error(`No database file found in backup folder: ${sourceDb}`);
  }

  console.log(`Using backup folder: ${sourceFolder}`);

  if (dryRun) {
    console.log('Dry run mode: no files were modified.');
    return;
  }

  const preRestoreFolder = path.join(backupDir, `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  await fsp.mkdir(preRestoreFolder, { recursive: true });

  for (const file of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(file)) {
      await fsp.copyFile(file, path.join(preRestoreFolder, path.basename(file)));
    }
  }

  for (const suffix of ['', '-wal', '-shm']) {
    const src = path.join(sourceFolder, path.basename(dbPath) + suffix);
    const dest = dbPath + suffix;
    if (fs.existsSync(src)) {
      await fsp.copyFile(src, dest);
    } else if (fs.existsSync(dest)) {
      await fsp.unlink(dest);
    }
  }

  const integrity = await integrityCheck(dbPath);
  if (!integrity || integrity.integrity_check !== 'ok') {
    throw new Error(`Integrity check failed after restore: ${JSON.stringify(integrity)}`);
  }

  console.log('Restore completed successfully');
  console.log(`Pre-restore snapshot saved at: ${preRestoreFolder}`);
}

main().catch((error) => {
  console.error('Restore failed:', error.message);
  process.exitCode = 1;
});
