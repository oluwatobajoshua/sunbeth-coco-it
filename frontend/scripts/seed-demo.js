#!/usr/bin/env node
/*
  Secure demo seeding script using Firebase Admin SDK.
  - Does NOT require relaxing Firestore security rules
  - Credentials options (choose one):
    1) GOOGLE_APPLICATION_CREDENTIALS=<path-to-key.json> (recommended for local)
    2) FIREBASE_SERVICE_ACCOUNT_JSON=<full-json-content>
    3) FIREBASE_SERVICE_ACCOUNT_BASE64=<base64-of-json> (great for CI secrets)
  - Project selection precedence:
    --project flag > FIREBASE_PROJECT_ID env > credentials.project_id
  - Usage:
    node scripts/seed-demo.js [count]
    node scripts/seed-demo.js --count 50 --project your-project-id
    node scripts/seed-demo.js --creds C:\\secrets\\your-project.json --count 100
    node scripts/seed-demo.js --dry-run --project your-project-id
    node scripts/seed-demo.js --help
  - PowerShell examples (Windows):
    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\secrets\\projA.json"; node scripts/seed-demo.js --project projA --count 50
    $env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content -Raw "C:\\secrets\\projB.json"; node scripts/seed-demo.js --count 25
    $env:FIREBASE_SERVICE_ACCOUNT_BASE64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\\secrets\\projC.json")); node scripts/seed-demo.js --project proj-c --dry-run
*/

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const argv = process.argv.slice(2);
  const has = (k) => argv.includes(`--${k}`);
  const val = (k) => {
    const i = argv.indexOf(`--${k}`);
    if (i !== -1) return argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
    return undefined;
  };
  // positional count backward-compat
  const positionalCount = argv.find(a => /^\d+$/.test(a));
  return {
    help: has('help') || has('h'),
    dryRun: has('dry-run') || has('dry'),
    credsPath: val('creds'),
    project: val('project'),
    count: Number(val('count') || positionalCount) || undefined,
  };
}

function printHelp() {
  console.log(`\nUsage: node scripts/seed-demo.js [options] [count]\n\nOptions:\n  --count <n>         Number of issues to generate (default 50)\n  --project <id>      Firebase projectId to target (overrides credential project)\n  --creds <path>      Path to service-account JSON (alternative to env vars)\n  --dry-run           Do not write to Firestore; print summary only\n  --help, -h          Show this help\n\nCredential sources (priority order):\n  --creds <path> | FIREBASE_SERVICE_ACCOUNT_JSON | FIREBASE_SERVICE_ACCOUNT_BASE64 | GOOGLE_APPLICATION_CREDENTIALS\n\nExamples (PowerShell):\n  $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\secrets\\projA.json"; node scripts/seed-demo.js --project projA --count 50\n  $env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content -Raw "C:\\secrets\\projB.json"; node scripts/seed-demo.js 25\n  $env:FIREBASE_SERVICE_ACCOUNT_BASE64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\\secrets\\projC.json")); node scripts/seed-demo.js --dry-run\n`);
}

function loadCredentialAndProject({ credsPathArg, projectArg }) {
  let source = 'unknown';
  let keyObj = null;

  if (credsPathArg) {
    try {
      const abs = path.resolve(process.cwd(), credsPathArg);
      const raw = fs.readFileSync(abs, 'utf8');
      keyObj = JSON.parse(raw);
      source = `file:${abs}`;
    } catch (e) {
      console.error('Failed to read --creds file:', e.message);
      process.exit(1);
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      keyObj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      source = 'env:FIREBASE_SERVICE_ACCOUNT_JSON';
    } catch (e) {
      console.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
      process.exit(1);
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    try {
      const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
      keyObj = JSON.parse(decoded);
      source = 'env:FIREBASE_SERVICE_ACCOUNT_BASE64';
    } catch (e) {
      console.error('Invalid FIREBASE_SERVICE_ACCOUNT_BASE64:', e.message);
      process.exit(1);
    }
  }

  let credential;
  if (keyObj) {
    credential = admin.credential.cert(keyObj);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault();
    source = `env:GOOGLE_APPLICATION_CREDENTIALS (${process.env.GOOGLE_APPLICATION_CREDENTIALS})`;
  } else {
    console.error('Missing service account. Provide --creds, FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_BASE64, or GOOGLE_APPLICATION_CREDENTIALS.');
    process.exit(1);
  }

  const projectFromEnv = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const project = projectArg || projectFromEnv || (keyObj && keyObj.project_id) || undefined;

  return { credential, project, source };
}

function rng(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

function generateIssues(count = 50) {
  const stations = ['coco-lagos-1','coco-abuja-1','coco-port-1','coco-kano-1','coco-ibadan-1'];
  const types = ['electrical','mechanical','safety','equipment'];
  const priorities = ['low','medium','high'];
  const statuses = ['reported','in-progress','resolved'];

  const base = [];
  // A few fixed, readable samples
  base.push({
    id: 'COCO-2025-101', stationId: 'coco-lagos-1', reporterId: 'john.manager@cocostation.com',
    issueType: 'electrical', priority: 'high', status: 'reported',
    description: 'Power surge affecting pumps #2 and #3',
    createdAt: new Date(Date.now() - 2*24*3600*1000)
  });
  base.push({
    id: 'COCO-2025-102', stationId: 'coco-abuja-1', reporterId: 'john.manager@cocostation.com',
    issueType: 'mechanical', priority: 'medium', status: 'in-progress',
    description: 'Nozzle calibration drift on dispenser 4',
    createdAt: new Date(Date.now() - 5*24*3600*1000)
  });
  base.push({
    id: 'COCO-2025-103', stationId: 'coco-port-1', reporterId: 'john.manager@cocostation.com',
    issueType: 'safety', priority: 'high', status: 'resolved',
    description: 'Slip hazard near entrance resolved by adding mats',
    createdAt: new Date(Date.now() - 9*24*3600*1000),
    resolvedAt: new Date(Date.now() - 7*24*3600*1000)
  });

  const res = [...base];
  const extra = Math.max(0, count - res.length);
  for (let i = 0; i < extra; i++) {
    const stationId = rng(stations);
    const issueType = rng(types);
    const priority = rng(priorities);
    const status = rng(statuses);
    const daysAgo = Math.floor(Math.random()*45);
    const createdAt = new Date(Date.now() - daysAgo*24*3600*1000);
    let resolvedAt;
    if (status === 'resolved') {
      const lag = Math.floor(Math.random()*7)+1;
      resolvedAt = new Date(createdAt.getTime() + lag*24*3600*1000);
    }
    res.push({
      id: `COCO-2025-${200+i}`,
      stationId,
      reporterId: 'john.manager@cocostation.com',
      issueType,
      priority,
      status,
      description: `${issueType} issue (${priority}) at ${stationId}`,
      createdAt,
      ...(resolvedAt ? { resolvedAt } : {})
    });
  }
  return res;
}

async function main() {
  const args = parseArgs();
  if (args.help) { printHelp(); process.exit(0); }

  const { credential, project, source } = loadCredentialAndProject({ credsPathArg: args.credsPath, projectArg: args.project });
  const initOptions = project ? { credential, projectId: project } : { credential };
  admin.initializeApp(initOptions);
  const db = admin.firestore();

  const count = args.count || 50;
  const issues = generateIssues(count);

  let created = 0, skipped = 0;
  for (const it of issues) {
    const ref = db.collection('issues').doc(it.id);
    const snap = await ref.get();
    if (snap.exists) { skipped++; continue; }
    const payload = { ...it };
    // Firestore stores Timestamps; Admin SDK handles Date -> Timestamp
    payload.updatedAt = new Date();
    if (args.dryRun) {
      // no-op write in dry-run
    } else {
      await ref.set(payload, { merge: true });
    }
    created++;
  }

  console.log(`\nSeed ${args.dryRun ? 'simulation (dry-run)' : 'complete'}.\n  Project: ${project || '(from credential)'}\n  Credential: ${source}\n  Requested: ${count}\n  Created: ${created}\n  Skipped (existing): ${skipped}\n`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
