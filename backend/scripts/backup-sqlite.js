import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '..');
const dbPath = path.resolve(backendDir, process.env.DB_PATH || 'fahamu_shamba.db');
const backupDir = path.resolve(backendDir, process.env.BACKUP_DIR || 'backups');

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function checkpointWal(targetDbPath) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(targetDbPath, (openErr) => {
      if (openErr) return reject(openErr);
      db.exec('PRAGMA wal_checkpoint(FULL);', (err) => {
        db.close();
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

async function main() {
  await fsp.mkdir(backupDir, { recursive: true });
  await checkpointWal(dbPath);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const folder = path.join(backupDir, `backup-${stamp}`);
  await fsp.mkdir(folder, { recursive: true });

  const candidates = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
  const copied = [];

  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const destination = path.join(folder, path.basename(file));
    await fsp.copyFile(file, destination);
    copied.push({
      file: path.basename(file),
      bytes: (await fsp.stat(destination)).size,
      sha256: await hashFile(destination)
    });
  }

  const manifest = {
    createdAt: new Date().toISOString(),
    dbPath,
    copiedFiles: copied
  };

  await fsp.writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log('Backup completed successfully');
  console.log(JSON.stringify({ backupFolder: folder, files: copied.map((c) => c.file) }, null, 2));
}

main().catch((error) => {
  console.error('Backup failed:', error.message);
  process.exitCode = 1;
});
