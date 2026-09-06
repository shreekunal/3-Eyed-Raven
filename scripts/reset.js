/**
 * db:reset — Drops the database (+ WAL/SHM files) then re-seeds fresh.
 *
 * Usage:  npm run db:reset
 */

const fs   = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath  = path.join(dataDir, 'raven.db');

// Remove DB and any SQLite WAL/SHM sidecar files
const filesToDrop = [dbPath, dbPath + '-wal', dbPath + '-shm'];
let dropped = false;

for (const f of filesToDrop) {
  if (fs.existsSync(f)) {
    fs.rmSync(f);
    dropped = true;
  }
}

if (dropped) {
  console.log(`\n🗑️  Dropped database: ${dbPath}`);
} else {
  console.log('\n⚠️  No database found — creating fresh.');
}

console.log('🔄  Running seed...\n');
execFileSync(process.execPath, [path.join(__dirname, 'seed.js')], { stdio: 'inherit' });
