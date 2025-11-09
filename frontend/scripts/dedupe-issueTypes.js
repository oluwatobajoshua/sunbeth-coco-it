#!/usr/bin/env node
/*
  Deduplicate issueTypes collection by `key`.
  Keeps the document whose id equals the key when available, otherwise keeps the first seen.

  Usage (PowerShell):
    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\service-account.json"
    node scripts/dedupe-issueTypes.js --project <projectId> --dry-run
    node scripts/dedupe-issueTypes.js --project <projectId>
*/
const admin = require('firebase-admin');

function parseArgs() {
  const argv = process.argv.slice(2);
  const has = (k) => argv.includes(`--${k}`);
  const val = (k) => {
    const i = argv.indexOf(`--${k}`);
    if (i !== -1) return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
    return undefined;
  };
  return { project: val('project'), dryRun: has('dry-run') };
}

async function main() {
  const { project, dryRun } = parseArgs();
  const cred = admin.credential.applicationDefault();
  const opts = project ? { credential: cred, projectId: project } : { credential: cred };
  admin.initializeApp(opts);
  const db = admin.firestore();

  const snap = await db.collection('issueTypes').get();
  const byKey = new Map();
  const toDelete = [];

  snap.forEach((doc) => {
    const data = doc.data() || {};
    const key = (data.key || doc.id || '').toString();
    if (!key) return; // skip malformed
    if (!byKey.has(key)) {
      byKey.set(key, doc);
    } else {
      // Prefer the doc whose id == key as the keeper
      const existing = byKey.get(key);
      const preferNew = doc.id === key && existing.id !== key;
      if (preferNew) {
        toDelete.push(existing);
        byKey.set(key, doc);
      } else {
        toDelete.push(doc);
      }
    }
  });

  console.log(`Found ${snap.size} docs in issueTypes; ${toDelete.length} duplicates to delete${dryRun ? ' (dry-run)' : ''}.`);
  if (dryRun || toDelete.length === 0) return;

  for (const d of toDelete) {
    try { await d.ref.delete(); console.log('Deleted', d.id); } catch (e) { console.warn('Failed to delete', d.id, e.message || e); }
  }

  console.log('Deduplication complete.');
}

main().catch((e) => { console.error(e); process.exit(1); });
